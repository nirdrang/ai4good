# Explainer eval, 2026-09-03: which model writes the how explanation

Variant under test: the model behind the `how explainer` role. Three explanations of the same tree (commit f81062e) from the same four explorer notes and the same request, blind to each other. Two blinded judges from families outside Claude scored all three in one pass each on the rubric in `rubric.md`.

| label | writer | length | time | tokens or cost |
|---|---|---|---|---|
| A | fable at low (new, sanitized worktree `harness-atlas`) | 309 lines, 24k chars | 3.2 min | 127k fable |
| B | opus at max (new, sanitized worktree `harness-map`) | 388 lines, 29k chars | 6.2 min | 149k opus |
| C | fable at max (the real run's explanation, 2026-09-02) | 611 lines, 42k chars | about 8 min | 253k fable |

## Judges

| judge | A | B | C | ranking | time, cost |
|---|---|---|---|---|---|
| sol at max | 17 | 11 | 15 | A > C > B | 28 min, cost not recorded |
| grok at xhigh | 19 | 13 | 18 | A > C > B | 13 min, $0.42 |

Both judges agree on the order. Sol scores factual accuracy harshly (floor for B and C with eight and seven material errors, four for A); grok found fewer errors in the same direction. Reviews: `review-sol.md`, `review-grok.md`.

## The lead's own read

A (fable at low) is the tightest of the three: the dependency table, the keep and drop list for the one-stack path, the count corrections, and the unmeasured facts, in 24k characters. Its errors are small (a wrong attribution of the 120-second pin to `prepare()` instead of the config generator; two v2 helpers listed among parked scripts).

C (fable at max) has the widest coverage (both judges give it 4 of 5) and the only full recipe for the one-stack path, at nearly twice the length, and it carries the one error a planner would act on wrongly (that pinning `jwt_expiry` on the stack changes what the loop fixture models; it does not).

B (opus at max) reads best as narrative and has the best ceremony diagram, but its in-scope facts slipped in counts and callers (seventeen scripts, all five exit codes printed, only four live callers while CI still called the twin guard at that commit, `AT_DB_SLOT` skipping the reservation check), and it omitted the shared-stack lock and the untargeted reset that a parking plan needs. It also read `loop/parked/v1/README.md` on main and wrote a closing section about how the work later landed. That is a leak in the eval setup, not a fault of the model: native agents run in the session's folder, so a sandboxed worktree does not stop reads outside it. The judges were told to treat that section as out of scope.

Transcripts: A opened 11 files and grepped 10 times, all inside its worktree. B opened 11 files and ran 13 shell commands, one outside.

## Verdict

Promote fable at low to the `how explainer` role. It won on both judges and in the lead's read, at half the tokens of fable at max and half the time of opus at max. Opus at max is not a replacement for this role: it lost to both fable settings on accuracy and coverage.

Caveats: one sample per model; the judges are two, not one, but both used the same prompt; the fable-at-max explanation came from the real run and the other two from this eval; the opus run saw the future.

## What changing it costs

The sheet now lives in the tree (`.claude/pstack-models.md`). The fable family already runs at two efforts (max and high). A third (low) is a further mixed effort that the next `/setup-pstack` rerun flags; the answer then is the rows in `.claude/skills/work/pstack-model-selection.md`. The change is a repository commit and needs the founder's word: commit to main, or ride on the next item.

# Round two, 2026-09-04: muse joins as a fourth candidate

The founder asked whether the model that won the review panel seat could also take the explainer
seat. It cannot.

Muse 1.3 at xhigh wrote a fourth explanation from the same four explorer notes, the same request
and the same commit. It ran through the external runner with an explicit working directory, so it
was sandboxed by process rather than by instruction, which is a cleaner sandbox than the three
earlier candidates had. All four were relabelled by a fresh random permutation and judged together
in one pass by two judges from different families. The key is `labels-round-2-do-not-show-the-judge.txt`.

| candidate | length | time | grok at xhigh | sol at max |
|---|---|---|---|---|
| fable at low | 24k | 3.2 min | 22 | 16 |
| fable at max | 42k | about 8 min | 22 | 15 |
| opus at max | 29k | 6.2 min | 18 | 11 |
| muse 1.3 at xhigh | 12k | 1.7 min | 10 | 10 |

Both judges rank the four identically: fable at low, then fable at max, then opus at max, then
muse. Both name the same single most consequential error across all four, and it is muse's: it
states that nothing needed at the loop tier imports the slot pool, missing the runner's load-time
import. Anyone planning the parking from that sentence breaks loop verification and CI on the first
commit. Muse also scores zero on coverage from both judges. Its brevity was thinness, not economy.

The lesson generalises. Muse won the review seat, where the job is reading a diff and reporting
findings. Writing a plan someone can act on from four sets of notes is a different job, and the
win does not transfer. Test each seat on its own work.

## The explainer recommendation is unchanged and now better supported

Fable at low wins all four judge passes across the two rounds. Move `how explainer` to
`claude:fable@low`. Still pending the founder's word.

One disagreement worth recording. Asked whether the best explanation could be handed to a new
engineer unchanged, grok said yes and sol said no, naming a seam count, a lock call and a vendor
claim that need correction first. Sol also applied the accuracy scale mechanically and gave all
four a zero there, which compresses its totals; its ranking is unaffected.