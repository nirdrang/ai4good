# Merge ruling — AI4DEV-80 (attribution by spawn tree)

Written by the merge sitting: orchestrator on fable (claude-fable-5 @ xhigh), 2026-08-11.
This ruling rides in the final head of pull request #52. The mechanical that executes the
merge names that head and its check run. The required check must be green on that exact
commit before the merge command runs. This pull request carries no batch partner and no
closes-line.

## 1. What was built

The burn report (`loop/work/attribution-report.ps1`) now reads the real agent transcripts
under `subagents/` directories, recursively, and stops reading the `.output` stand-in
files. It builds the spawn forest from the platform's `agent-*.meta.json` records. When a
transcript resolves no item on its own, the report walks the spawn tree upward and
inherits the item from the nearest resolving ancestor. A sitting's tokens now land under
its item and its role. A new selftest (`loop/work/attribution-report.selftest.ps1`)
carries fifteen enumerated asserts against a synthetic spawn forest. The item touches two
code files, both under `loop/work/`; everything else in the diff is the item's own record.

## 2. Heads and the evidence trail

- Branch base: `ac8a235`. Plan and gate rulings: `plan.md` sections 7-10,
  `gate1-rulings.md`, `gate2-rulings.md`, `audit-rulings.md`.
- Audited head (first audit): `2be9782`. Fix head and re-run head: `8af0e18`.
- Forward merge of main into the branch: `93ee7f1` (see section 5). The item's own diff
  is byte-identical across that merge: patch-id `d4b20d0b8448731ba3301aedf5ca06d88c83bbd6`
  both before and after. No item code changed after the audit re-run.
- Full-range scope, measured this sitting: 54 files, all under `loop/items/AI4DEV-80/` or
  `loop/work/`; the only code files are the report and its selftest.

## 3. Findings and dispositions

**Gate 1 (plan review, one reader):** ten findings, ten rulings — seven accepted (three
of them fixed differently), one accepted in part with the remainder rejected with a
written reason, and two of the accepts carried checked removal or correction conditions.
Full table: `plan.md` section 7; verbatim claims in `gate1-rulings.md`.

**Gate 2 (draft code review, two readers):** reader one landed six findings. Two were
verify-first: one PROVEN by measurement (580 cross-session tool-use-id duplicates; the
spawn context is now keyed by session plus tool-use id) and one DISPROVEN by an
in-process culture probe (no code change). The other four were accepted and landed in
code and fixture. Reader two died empty once, was relaunched, and named the same six
defects; it had read the committed rulings, so its convergence carries no independence
weight. Full table: `plan.md` section 9; verbatim claims in `gate2-rulings.md`.

**First audit (two readers, blind to each other):** reader one landed two findings, both
accepted. AUD-1: the spawn-context key now pins on every first sighting, empty when the
session state resolves nothing; new assert A15 was red against the audited code and green
after the fix (`selftest-a15-red.txt`, `selftest-a15-green.txt`). AUD-2: a false plan
sentence ("Default invocation output is unchanged.") was replaced by the narrow
seams-only claim; a record cure, no code change. Reader two was clean; its two
shell-blocked boxes were settled PASS by the sitting's own measurement. The two seats
conflicted on two boxes (one seat PASS by reading, one seat FAIL by tracing); the traced
FAIL won — a PASS proves the reader saw no defect, never that none exists. Full record:
`audit-rulings.md`; summary: `plan.md` section 10.

**Audit re-run (both seats, scoped to the fix delta):** both clean.
- Reader one: "AUDIT: CLEAN" — all 19 checklist boxes PASS or CARRIED-FORWARD.
- Reader two: "AUDIT: 0 FINDINGS" — 18 boxes PASS or CARRIED-FORWARD with cited
  file:line evidence; the scope box was COULD-NOT-VERIFY (its cage has no shell). This
  sitting settled that box PASS with the reviewer's own settling command: 54 files in the
  full range, zero outside the declared paths.
- Two observations were recorded by the readers as out of scope, not findings, and this
  ruling keeps them in words in section 8 (items 3 and 4).

No reviewer maintained a disagreement against any ruling. No "this green is unearned"
tag exists.

## 4. The red check runs, classified

Thirteen pull-request check runs failed between 2026-08-10 22:00 UTC and 2026-08-11
00:32 UTC, ending with run 31446415848 at head `8af0e18`. One cause, outside this branch:

- Main added a new guard step (the orchestrator twin check) at 21:55:18 UTC. The last
  green run on this pull request started at 21:55:00 UTC — eighteen seconds earlier.
- A pull-request run takes its workflow from the merge ref, so the new step ran; the
  checkout is deliberately the branch head, whose tree predates the step's script
  (`loop/work/twin-check.ps1`). The step failed on a missing file in seconds. The twin
  comparison itself never ran, so this is not a twin drift.
- The earliest and the latest failed runs were both inspected: the same single step
  failed in both. Main's own push runs stay green with the guard in place.
- This branch never touched the agent contracts or the workflow, and its files are
  disjoint from main's changes. Not this item's defect, not infrastructure, not a flake —
  so the one-re-run budget stays unspent; a re-run is pinned to its original workflow
  snapshot and would fail identically.
- Main has since fixed the skew for stale branches (the guard now skips loudly when the
  script is absent). The cure for this branch is the forward merge `93ee7f1`: it brings
  the script, the fixed workflow, and main's twin files into one consistent tree. The
  twin check passes locally on the merged tree ("SYNCED - 231 body lines identical apart
  from the declared differences", exit 0). The item's diff is unchanged (section 2), so
  the spent audit stands.

## 5. What the green does and does not claim

The diff is prose-lane territory, so the required check runs the guards only: the twin
check, the item-ownership and reference guard on the pull-request text, and the
changed-file derivation. **The green does not claim a code review and does not run the
TypeScript suite or the item's own scripts.** This item's verification is the committed
evidence: the selftest red-then-green captures (`selftest-red.txt`, `selftest-green.txt`,
`selftest-a15-red.txt`, `selftest-a15-green.txt` — fifteen asserts at close), the
before/after report runs, and the A/B run at the fix head. The code-review weight rests
on the two gates and the two-seat audit recorded above.

## 6. What the evidence shows, plainly

The board item expected the unattributed share to "drop sharply". Measured on the real
store at the fix head: the unattributed output-token share moves 70.6% to 67.5%. The
share does not drop sharply because the same change enlarges the denominator: transcript
files scanned grow 479 to 924, responses 26352 to 49336. The attribution itself nearly
doubles: attributed responses grow 10816 to 21345 (+97.4%); the spawn-tree source
attributes 4445 responses across 14 items; the previous item's scoped burn view grows
from 249 responses in 2 roles to 1935 responses in 7 roles. Most remaining branchless
responses sit in coordinator sessions on `main`, where the tree has nothing to hand
down. **Open founder question, raised here and not resolved by this ruling: does the
founder accept the attribution numbers as the headline evidence, in place of a sharp
percentage drop?** The mechanism is proven either way; this shapes how the item's
outcome is read, not whether it merges.

One maintained evidence note on AUD-1: an A/B run (audited code against fixed code,
identical parameters) produced identical output on today's store. The pin corrects
first-sighting semantics that today's store does not yet exercise; assert A15 is what
proves the corrected behaviour.

## 7. Ambiguities and residuals the record keeps

- Ambiguous agents (own records name two items): 2. Metaless agents: 0. Both counted,
  neither guessed: an ambiguous agent stays unattributed, and its vendor spend stays
  unjoined (gate ruling G2-2).
- The measured floor: most branchless responses have their whole ancestry on `main` or on
  a branch naming no item — no tree can attribute those, by design.

## 8. Follow-ups — filed in words, not built

1. The flash/opencode reviewer-spend join (scoped out by the item).
2. One sentence for the conductor contract and the workflow: a derived gate SKIP is a
   floor; an orchestrator ruling recorded in the phase state may tighten it to RUN, never
   the reverse (from gate ruling G1-1).
3. Pre-existing, untouched by this item: a session transcript whose tool result quotes a
   stamp can corrupt that session's stamp state in the report (observed at gate 2,
   re-observed by an audit seat).
4. Pre-existing, untouched by this item (audit re-run observation, reader one): the
   branch regex at `attribution-report.ps1:136` does not guard against a preceding
   backslash, so a line containing only an escaped `"gitBranch"` could match. The fix
   delta cannot reach it.

## 9. Decision

The item merges. Every gate finding, audit finding and re-run verdict is ruled and
recorded above. The required check must be green on the final head; the mechanical
records the run id and the head SHA beside this ruling when it executes the merge
(squash). The merge closes this item on the board; no other item id appears in this
ruling or in the pull-request text.
