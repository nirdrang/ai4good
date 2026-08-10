# Gate 2 rulings — AI4DEV-80 (attribution by spawn tree)

Ruled by the FIX-AND-GOAL sitting (first half), orchestrator on fable (claude-fable-5 @
xhigh), 2026-08-11, at head `9c8a6bd` plus this sitting's record commits (code in
`loop/work` unchanged from `9c8a6bd`). Gate 2 is a panel of two readers. Reader one
(terra via codex) landed six findings; they are ruled below as G2-1 through G2-6. Reader
two (flash via opencode) produced an EMPTY GATE — that anomaly is ruled at the end of
this file. Every claim is quoted verbatim from the reader's distillate.

## G2-1 — the stamp fallback reaches agent files — ACCEPT

> "An ambiguous agent can be attributed from `$curStamp` instead of remaining
> unattributed." (severity high, `loop/work/attribution-report.ps1:343`; the reader's
> failure case: "An M1-style file with two item branches, then a stamp and a blank-branch
> response has an empty tree item but reaches this stamp fallback, violating the required
> 'degrade, never guess' behavior; A9 does not cover that state.")

Verified against the code. The counting loop updates `$curStamp` for EVERY file (line
329) and applies the stamp fallback for EVERY file (line 343). Plan D3 rules the stamp
fallback for SESSION files only; an agent file resolves branch → tree → unattributed.
The stamp regex deliberately matches the escaped form, so an agent transcript that
quotes a stamp — in a spawn prompt or a tool result — sets `$curStamp`, and an ambiguous
or unresolvable agent's branchless responses would then be guessed from it. That is the
same defect class ruling G1-4 closed for the tree path, open on a second door.

**Fix**: apply the `$curStamp` fallback only when the file is a session file
(`-not $isAgent`). **Fixture**: `agent-M1.jsonl` gains a stamp line naming `AI4DEV-902`
before its branchless lines. No new assert id: A1's stamp-row counts, A9's unattributed
count and A11's exact unattributed row — all computed from the fixture's bytes — go red
if the fallback leaks.

## G2-2 — `$agentItem` collapses a multi-item agent — ACCEPT

> "`$agentItem` collapses a multi-item agent to whichever direct branch response occurs
> last." (severity high, `loop/work/attribution-report.ps1:349`; the reader's failure
> case: "M1 is set to AI4DEV-901 then AI4DEV-902; a `wd_agent-M1_*` Kimi session would
> have all of its spend credited to AI4DEV-902 despite no item fact for that spend. The
> ambiguity safeguard is bypassed for the Kimi join, and A10 only tests an unambiguous
> agent.")

Verified against the code. Line 349 assigns `$agentItem[$joinKey] = $ids[0]` on every
branch-resolved record, so the last branch record wins the join key. Per-RECORD
attribution to two items is a fact; per-AGENT vendor spend credited wholly to the last
of them is a guess. The kimi join must degrade exactly as the tree walk does.

**Fix**: skip the `$agentItem` assignment when the file is an agent file whose own
records name two or more items — the pre-pass `$fileItems` already holds that count. The
ambiguous agent's kimi spend then stays unjoined, which the existing floor note already
describes. The tree-fed assignment needs no guard: an ambiguous agent never has a tree
item. **Fixture**: a `wd_agent-M1_*` kimi directory with turn-usage lines carrying
distinctive amounts. A10 extends: the kimi table holds exactly one row (the O1 join) and
its output tokens equal the O1 wire sum alone.

## G2-3 — spawn context keyed globally by toolUseId — VERIFY FIRST

> "Spawn context is keyed globally by `toolUseId`, not by its enclosing session."
> (severity medium, `loop/work/attribution-report.ps1:219`, unverified-runtime-claim:
> yes; the reader's failure case: "If two sessions reuse a tool-use id, the first session
> wins and a branchless root agent in the other session inherits the wrong item.")

The claim is structurally true and its consequence depends on a runtime fact the reader
could not check: whether `toolu_` ids ever repeat across sessions. The executor measures
the real store before any code change:

1. every meta file's `toolUseId` — does any value appear in the metas of two DIFFERENT
   sessions?
2. every session transcript, scanned with the report's own `$tuIdRe` — does any
   `toolu_` id appear in two or more different session files?

If both counts are zero (expected — the ids are provider-minted with high entropy), the
risk is ACCEPTED: the measurement goes in the record beside this ruling and the code
does not change, because a per-session key adds plumbing for a collision never observed
on 900-plus agents. If any cross-session duplicate exists, the fix keys `$spawnCtx` by
session file plus toolUseId and derives an agent's session from its directory path. No
fixture either way — a fixture would only encode whichever answer we assumed.

## G2-4 — the fixture lacks the nested W1 case — ACCEPT, ALREADY RULED

> "The fixture never creates the amended nested `subagents/workflows/wf_*/agent-W1.jsonl`
> case." (severity high, `loop/work/attribution-report.selftest.ps1:297`; the reader's
> failure case: "A flat direct-child scan would still satisfy every current expected
> count, so a green selftest does not prove the recursive workflow-store requirement that
> covers most real agent transcripts.")

Correct, and already ruled: draft ruling D-1 and the state file schedule exactly this
fixture agent (W1, `workflows/wf_1`, joining A1 and A3) for this fix pass. The reader
was told the amendment postdates the draft and independently confirmed WHY it matters —
a flat scan would still pass every current assert. Convergence noted; no work beyond
what stands. W1's tokens join A1's tree expectation and A3's totals.

## G2-5 — A1 checks response counts, not tokens — ACCEPT

> "A1 claims token attribution but checks only response counts for its per-item/source
> rows." (severity medium, `loop/work/attribution-report.selftest.ps1:299`; the reader's
> failure case: "Output tokens could be moved between item/source rows while preserving
> response counts and A3's global total; A8 derives its expected output total from the
> report's own rows, so it would not detect that misallocation.")

Verified against the selftest. A1 compares `.Responses` only on its four rows, and A8's
expected root totals are derived from the report's own row objects — self-referential,
exactly as claimed. **Fix**: A1 also asserts `OutputTok` per row, computed from the
fixture's own measurements: branch = C1 + M1's first branch line, tree = O1 + O2 + E1 +
U1 + W1, stamp rows = each session segment. Computed, never hard-coded, like every other
expectation in the file.

## G2-6 — A11 assumes a dot decimal separator — VERIFY FIRST

> "A11 assumes the printed percentage uses a dot decimal separator, while the report
> does not force invariant formatting." (severity low,
> `loop/work/attribution-report.selftest.ps1:396`, unverified-runtime-claim: yes; the
> reader's own settling condition: "run the selftest with a culture such as `de-DE` to
> settle this.")

The premise is literally true — nothing at the print site names a culture. The expected
defence is that PowerShell's implicit string conversion (`'…' + $pct`) and
`ConvertTo-Json` use the invariant culture regardless of the OS culture, so the printed
share is always dot-decimal. That is a runtime fact; the reader marked it unverified and
named the probe. The executor settles it: in a Windows PowerShell 5.1 process with
`CurrentCulture` set to `de-DE`, evaluate the report's exact print shape
(`'x: ' + [math]::Round(100.0*2/3,1) + '%'`) and `ConvertTo-Json` over the same value.
Both emitting `66.7` disproves the finding — the probe output goes in the record and
nothing changes. Either emitting `66,7` proves it — then the fix forces invariant
formatting at the report's print site, never by loosening the test's regex.

## Reader two (flash via opencode) — EMPTY GATE, ruled: RELAUNCH

The reader-two process died before reading anything: zero tokens, `step_finish` reason
"unknown", no count line, empty stderr. The runner cleaned its own working files per the
opencode lane's convention, so there is nothing to commit for that run and no distillate
exists. An empty gate is never a clean gate, and one landed seat never absorbs the
other's failure.

**Ruling: the conductor relaunches reader two.** Reasons:

1. The two-reader panel at this gate is pinned in `reviewers.md` (founder ruling,
   2026-08-09). Proceeding on one seat loosens a founder-pinned process, and loosening
   is never inferred.
2. The failure is pre-content: the reviewer read nothing and asserted nothing, so
   nothing about this code was judged and nothing about it caused the death.
3. A relaunch costs a fraction of a cent (measured on the opencode lane) against a seat
   that has caught real defects with zero false positives in its graded trials.

Only the conductor spawns reviewer-runners; this sitting rules the relaunch and does not
perform it. The prompt is handed UNCHANGED (`loop/items/AI4DEV-80/gate2-flash-prompt.txt`)
— editing it to steer the reader away from this sitting's committed record would itself
hint that another reviewer exists, which the panel forbids. Residual risk, accepted and
recorded: the relaunch pins a head whose `loop/items/AI4DEV-80/` now carries reader
one's evidence and these rulings; the reviewed CODE in `loop/work` is unchanged from
`9c8a6bd`. The successor sitting weighs any reader-two finding that mirrors reader one's
distillate wording rather than the code, and says so if it sees it.

---

# Reader two (flash via opencode) — relaunch LANDED, six findings, ruled

Ruled by the FIX-AND-GOAL sitting (second half), orchestrator on fable (claude-fable-5 @
xhigh), 2026-08-11, at head `0c86d61` (code in `loop/work` still unchanged from `9c8a6bd`).
Count line `CODE REVIEW: 6 FINDINGS`, matched by the distillate
(`artifacts/gate2-flash-distillate.md`; raw output, tool-call summary and identity extract
committed beside it).

## Blindness contamination — a fact, weighed before any disposition

The raw output states the reviewer read `gate2-rulings.md` and `gate2-terra-distillate.md`
during its run; the runner's tool-call log confirms a read of the terra distillate. The
panel requires each seat blind to the other, and this seat was not. The relaunch ruling
above accepted exactly this risk in writing: the record was committed, the prompt could not
be edited to steer around it, and nothing can hide the tree from a reader that looks.

Consequence for weight: flash's agreement with reader one is NOT independent confirmation.
Convergence between the two seats carries no added signal at this gate, and no disposition
below rests on it. Each flash finding is judged against the code alone — and each was
already verified against the code when reader one's seat was ruled. Flash's own sentence
that it "independently re-derived each of the six from the code rather than from that
reader's wording" cannot be verified and receives no weight.

Mirror check (the standing instruction from PHASE-STATE): flash's claims are phrased in
its own words and cite its own line spans — its nested-store finding cites the
fixture-builder span `selftest.ps1:162-231` where reader one cited the assert list at
`:297`, and its decimal-separator finding adds the report's print site
(`attribution-report.ps1:564`), which reader one did not cite. That is consistent with
reading the code, but with reader one's distillate in its context the wording evidence is
inconclusive. Recorded as inconclusive, not leaned on.

## Dispositions — six findings, six subsumptions, no new defect

Flash's six findings name the same six defects reader one's seat named. Each is subsumed
by the standing ruling, which does not change:

- **Flash [1]** — "The stamp fallback fires for agent files, though plan D3 restricts the
  stamp fallback to session files." (high, `attribution-report.ps1:343`) — **subsumed by
  G2-1 (accept)**. Same line, same defect, and flash independently names the same fix
  (`-not $isAgent`) in its outside-findings observation. No new work.
- **Flash [2]** — "`$agentItem` collapses a multi-item agent to whichever branch-resolved
  record occurs last in its file." (high, `attribution-report.ps1:349`) — **subsumed by
  G2-2 (accept)**. No new work.
- **Flash [3]** — "The fixture never creates the nested `subagents/workflows/wf_*/` store,
  so the suite cannot detect a regression to a flat scan." (high,
  `selftest.ps1:162-231`) — **subsumed by G2-4, itself already ruled at the draft (D-1)**.
  The W1 fixture agent lands this pass. No new work.
- **Flash [4]** — "A1 asserts response counts only, and A8 derives its expected rollup from
  the report's own rows — neither can detect token misallocation." (medium,
  `selftest.ps1:298-300, 362-366`) — **subsumed by G2-5 (accept)**. No new work.
- **Flash [5]** — "Spawn context is keyed by `toolUseId` alone, with no enclosing-session
  component." (medium, `attribution-report.ps1:219`, unverified-runtime-claim: yes) —
  **subsumed by G2-3 (verify first)**. One probe settles both seats' claim.
- **Flash [6]** — "A11's printed-percentage check assumes a dot decimal separator that
  nothing forces." (low, `selftest.ps1:396-400` and `attribution-report.ps1:564`,
  unverified-runtime-claim: yes) — **subsumed by G2-6 (verify first)**. Flash adds the
  print-site line number; the probe already targets that exact print shape.

## Outside-findings observation — pre-existing exposure, FILED IN WORDS

Flash, verbatim: "the same escaped-stamp-matching that makes finding [1] possible can also
corrupt `$curStamp` in *session* files when a tool result quotes a stamp — that behaviour
predates this branch's rework, so I do not count it against this change; [1] is the new
exposure this branch introduces (agent files were never scanned before), and its fix
(`-not $isAgent`) is the right single door to close."

Ruling: correct on both halves. The session-file stamp fallback predates this branch and
D3 preserves it unchanged; a defect this branch did not introduce belongs to another item.
FILED IN WORDS, not built: a session transcript whose tool result quotes a stamp can
corrupt that session's stamp state in the attribution report — pre-existing, untouched by
this item. Carried in PHASE-STATE's filed list.

## Panel disposition

Gate 2 closes with SIX defects total, not twelve — the two seats converge on the same six.
The convergence is recorded but, because of the contamination above, given no independence
weight. The fixes proceed exactly as ruled at G2-1 through G2-6.

---

# Verify-first outcomes and the fix-pass report — ruled

Ruled by the FIX-AND-GOAL sitting (second half) after the executor's pass, 2026-08-11.
The executor's commits: `1349848` (probes), `c20d6c9` (fixes), `d3a7368` (RED),
`3a5e25e` (green), `0499e51` (after evidence).

## G2-3 — PROVEN. The pre-ruled fix is in the code.

The probe (`artifacts/g2-3-probe.txt`) measured the real store both ways the ruling
named. Meta files: 884 metas, 269 with a `toolUseId`, 269 distinct values, ZERO in two
sessions. Session transcripts, scanned with the report's own regex: 10497 distinct
`toolu_` ids, **580 appear in two session files** — all 580 in ONE file pair. The
provider does not reuse ids; a RESUMED session writes a copy of the earlier session's
records, so the records are duplicated, not the ids. **Five of the 580 resolve a
DIFFERENT item in the two files** — exactly the harm both seats named. The duplicate
condition fired, so the pre-ruled fix applies and is implemented: `$spawnCtx` keyed by
session plus tool-use id; a session file's id is its base name; an agent's session
derives from its directory path. Measured before/after: every subagents directory pairs
with a same-named session file (7 of 7), and the same 7 root agents resolve an item
under both keys — the guess goes, no answer goes. One probe settles both seats' claim
(flash [5] with it). The fix is not fixture-detectable — the fixture holds one session —
which the original ruling decided in advance; its evidence is the committed measurement.

## G2-6 — DISPROVEN. No code change.

The probe (`artifacts/g2-6-probe.txt`), run IN-PROCESS under `de-DE`: the report's exact
print shape emits `66.7`, `ConvertTo-Json` emits `66.7`, and a culture-aware `ToString`
in the same process emits `66,7` — the control proving the culture was live. Second
instrument: the real report run in-process under `de-DE` printed its share with a dot.
The executor's first attempt used a child `powershell` process and was DISCARDED from
the evidence — a child process takes the OS culture, so it never ran under `de-DE` at
all; the discard is the correct reading and is recorded here. Flash [6] settles with it.
The print site and the selftest regex both stand unchanged.

## The executor's two unruled additions — both RATIFIED

1. The floor note's ambiguous-agent sentence now also states that their vendor spend
   stays unjoined. G2-2 changed that behaviour, and step S7 requires no output sentence
   to contradict behaviour — this is S7 compliance, not scope growth.
2. `selftest-green.txt` carries three mutation checks (each new guard removed in turn,
   suite re-run, mutation reverted): the G2-1 guard's removal turns five asserts red,
   the G2-2 guard's removal turns exactly A10 red, a flat scan turns A1/A3/A13 red.
   Ratified: it proves the fixture plants the hazards the rulings paid for, it changed
   no shipped code, and the tree is clean.

## The executor's proposed judgment — RULED: the report's text does not change

The observation: the store grows while the item is worked (the sittings write into the
store the report reads), so two heads cannot be compared unless both captures are taken
at the same moment. Ruling: TRUE, and it is a property of before/after EVIDENCE, not an
attribution floor — the report's floor note lists what attribution cannot resolve, not
how to compare two runs. Its home is the delta note (`after-delta.md`, section 5), where
it is recorded. The report's own text stays as S7 left it.

## Goal state, confirmed by this sitting

RED matched the predicted pattern assert for assert (PASS = A4, A8, A14; eleven FAIL,
exit 1). Green on the FIRST goal iteration, exit 0, all fourteen asserts; the default
report runs clean on the real store (919 files, 55 seconds). S8 re-measured at the goal
head: unattributed 70.6% → 67.6%, transcript files 479 → 919, responses 26352 → 49071 —
both denominators stated beside both percentages in `after-delta.md`. The open founder
question about the headline stays live for the merge ruling.
