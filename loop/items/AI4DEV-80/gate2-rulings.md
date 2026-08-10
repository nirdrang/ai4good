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
