# PHASE-STATE — AI4DEV-82 (window guard at the sitting boundary)

## PARK NOTE — 2026-08-12, founder ruling

This item is PARKED. It is not closed. It is not merged.

**Reason.** The founder ruled to stop this item on 2026-08-12. Founder ruling, verbatim: "Stop.
The item without a valid sensor this is useless." The watchdog's sensor for founder-presence
cadence was measured tonight and found unreliable. A separate item now carries the sensor
redesign. This item resumes after that item lands.

**Phase at park time.** The audit panel ran with two readers, `gpt-5.6-luna` and
`opencode-go/deepseek-v4-flash`. The panel found 7 findings in total (luna found 3, flash found
4, one pair converged into a single ruling). The audit sitting ruled 6 findings accepted and 1
rejected. All 6 accepted fixes were applied. See `audit-rulings.md` for the full record.

**Verified head at park time.** Commit `284edb6`, branch
`nirdrang/ai4dev-82-window-guard-at-the-sitting-boundary-park-before-the-wall`. The tree is
clean. The remote agrees with local head.

**What was NOT done.**
- The once-per-item audit panel re-run was never run and never decided. This item's own
  contract requires that re-run after any audit-driven fix, before anything can move to merge.
- CI was never armed on this final head.
- No merge sitting ran.
- The stale PR #56 body issue is still open. An earlier sitting flagged that the PR body still
  shows "Current state: PLAN phase" and asked the merge sitting to fix it. It is still unfixed.
  Noted here for whoever resumes.

**What resumption needs, in order.**
1. Confirm the sensor redesign item has landed and the sensor is trustworthy.
2. Re-open this branch.
3. Run the once-per-item audit panel re-run. Use both readers again, at whatever head resumption
   starts from. If no further code changes are needed, re-run at `284edb6`. If the sensor
   redesign requires touching this item's code too, that is a fresh decision for whoever
   resumes.
4. If the re-run is clean, proceed to CI and merge. If it is not clean, a fresh audit sitting
   rules on the new findings.

**Reference the item's own history.** Gate 1 rulings (`gate1-rulings.md`), gate 2 rulings with
three addenda including the corrected alarm diagnosis (`gate2-rulings.md`), and the audit
rulings (`audit-rulings.md`) are the full record. They should not be re-litigated on resumption
without cause.

**Known gap, carried forward — unrelated to the park reason, but real.** The per-tool alarm's
end-to-end delivery was never proven. A proposed fix was tested and found unsafe: it silently
exits 0 under Git Bash `sh`. That fix was NOT applied. This remains true and unresolved at park
time.

---

## Prior sitting's phase record (STALE — kept for reference only)

The section below was written by the RECOVERY FIX AND GOAL sitting, before the audit sitting
ran. It says "Phase: FIX AND GOAL COMPLETE" and describes the state as of the fix, not the
audit. It is superseded by the park note above and by `audit-rulings.md`. Kept for history.

**Phase: FIX AND GOAL COMPLETE — the next event is the AUDIT, a wait the conductor holds.**
Written by the RECOVERY FIX AND GOAL sitting, orchestrator on **opus @ max**, 2026-08-12. Chain,
derived from the branch: `AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the sitting
boundary)`. Bring-up item; no database slot. The pull request is #56.

### Why this sitting ran on opus, and what the conductor must decide next

This is neither the merge sitting nor the audit re-run, so it should have been fable. It ran on the
opus twin as the standing fallback because an active vendor incident ("degraded performance for
multiple models", open since 13:50 UTC) had already killed two fable sittings of this item mid-write
with 529 Overloaded. A vendor incident — not a session limit, not credit.

**The AUDIT sitting normally runs on fable.** Before spawning it, the conductor must check whether
that incident is still active and report the state. That call is the conductor's, not this
sitting's. If fable is healthy, the audit sitting is fable; if the incident is still open, it is the
opus twin under the same fallback, and the sitting says so in its first line either way.

### What happened this sitting

1. Recovered the dead sitting's untracked evidence and committed it: both readers' raw output and
   distillates, the opencode reader's tool-call summary and identity extract, and the unfinished
   `gate2-verification/` probe work. The probes were RE-RUN by this sitting rather than inherited.
2. Ruled all 15 gate 2 findings — 13 accepted, 2 rejected with written reasons, three convergent
   pairs across the two blind readers. `gate2-rulings.md`, pushed BEFORE any code changed.
3. One executor applied all 13 accepted fixes. Every suite green.
4. Three ADDENDA to the rulings, each pushed before the work it authorized. **Addendum 3 records
   that Addendum 2's diagnosis was WRONG and its proposed fix FORBIDDEN.** Read it before touching
   the alarm.

### Verification state at this head

| check | result |
|---|---|
| `window-sim.ps1` | 70 passed, 0 failed, exit 0 (was 60) |
| `window-watchdog-drill.ps1` standalone | 65 passed, 0 failed, exit 0 (was 54) |
| `run-drills.ps1` | 74 of 74, exit 0, watchdog + twin-check included |
| fold binding | forced red → exit 1, failing line echoed up; restored → green |
| alarm hook overhead | median 35.5 ms against a ruled 100 ms target |
| statusline overhead added by this item | 82.4 ms per refresh |
| settings-proof probe | 3 entry shapes PROVEN; 2 alarm entries did NOT deliver |
| live snapshot integrity | SHA256 unchanged all sitting, no drill or probe marker, no canary trip |

`run-drills.ps1` was re-run by the ORCHESTRATOR, not only by the executor, with the live snapshot
hashed before and after.

### THE ONE THING THAT IS NOT PROVEN — read this before writing anything about this item

**The per-tool alarm is not proven to deliver end to end.** Both alarm entries returned nothing in
the headless probe while every other entry fired, and the cause was never established. It is NOT
the command string: `window-alarm.cmd`, invoked exactly as `settings.json` spells it, exits 2 with
the alarm line on stderr under every shell that could be tested.

**The obvious fix is forbidden and measured.** `cmd /c "<path>"` exits 0 with NO output under Git
Bash `sh` — MSYS mangles the `/c` switch, `cmd` starts interactively and exits clean. An alarm that
exits 0 silently is indistinguishable from `verdict OK`, which is the exact failure this item
exists to remove, and it would pass the overhead check because a `cmd` doing nothing is fast. A
comment in `window-alarm.cmd` records this so the next reader meets the measurement first.

**What the green claims:** a passing drill suite, and the gate, the warning channel and the founder
stamp proven at runtime against the deployed entry shapes. **What it does NOT claim:** that the
per-tool alarm delivers. Any sentence saying "three hooks working" is false.

### What completes the next phase (SUPERSEDED — the audit ran; see audit-rulings.md and the park note above)

THE AUDIT — a panel of two, blind to each other, at the head this file rides in (verify against the
remote):

- reader one · `gpt-5.6-luna` · effort `max` · codex · `--sandbox read-only` · prompt
  `loop/items/AI4DEV-82/audit-luna-prompt.txt`
- reader two · `opencode-go/deepseek-v4-flash` · `--variant max` · opencode · agent
  `reviewer-flash` · clean session · prompt `loop/items/AI4DEV-82/audit-flash-prompt.txt`

Both prompts are assembled and committed. The CLAIM CHECKLIST is in `audit-additions.md`, already
folded into both. **The auditors' change-set command is scoped to this item's declared territory —
the default source-only diff yields an EMPTY list here, and the prompts carry the correct command.**

Clean means BOTH readers clean. If either finds anything, the conductor spawns an AUDIT sitting; if
both are clean, the merge sitting absorbs that wait.

### Facts the next sitting needs

- Branch base for the audit diff: **390042c**.
- Gate 2 rulings and all three addenda: `gate2-rulings.md`. Gate 1: `gate1-rulings.md`. Draft:
  `draft-rulings.md` (carries the REAL INCIDENT record).
- Adopted claim ids for the checklist: gate 1 `[1]`–`[6]`, draft `[E1]`–`[E5]`, gate 2
  `[T1]`,`[T3]`,`[T4]`,`[T5]`,`[T6](a)`,`[T6](c)`,`[T7]`,`[T8]`,`[T9]`,`[F1]`,`[F2]`,`[F4]`,`[F5]`,`[F6]`
  plus the `[T2]` hardening. REJECTED and must NOT appear as implemented: `[T2]` as stated,
  `[T6](b)`.
- The six draft commits carry a `Co-Authored-By: Claude Fable 5` trailer but were written by an
  OPUS executor. Trailers on this branch are not model attribution.
- D11's contingencies: `additionalContext` visibility is CLOSED (proven visible, full guarantee
  stands). `PostToolUseFailure` dispatch remains OPEN, folded into the post-merge live check.
- `UserPromptSubmit` DOES fire headless — a limitation this item nearly recorded as measured, and
  disproved only because ruling `[T4]`/`[F1]` gave the stamp case its own over-the-line run.
- node_modules is not installed in this tree; nothing in this item needs it.

### REQUIRED of the merge sitting (unchanged; still applies whenever this item reaches merge)

1. Verify post-merge, in the live interactive session, whether the alarm line appears after a tool
   call while the window is over the line. It is directly observable and needs no probe. Record the
   result in the merge ruling.
2. **If it does not deliver live, FILE A FOLLOW-UP ITEM** to characterize `PostToolUse` /
   `PostToolUseFailure` dispatch and repair delivery. Do NOT reach for the `cmd` wrapper.
3. State in the merge ruling exactly what the green does and does not claim, in the wording above.
4. Verify the committed settings' absolute paths went live post-merge and whether the running
   session picked the entries up.

### Open questions for the founder

**None that block, but ONE the founder should be told at merge, and it is not an escalation.** The
founder's design asks for three hooks. Three are built and wired; two are proven at runtime and the
third — the per-tool alarm — is proven only in isolation. That is an evidence gap, not a
contradiction of ratified text and not scope growth, so it is not escalated now. It becomes a real
finding only if the post-merge live check fails, and the merge sitting must put the result in front
of the founder either way rather than let a narrowed claim pass quietly.

One option was rejected precisely because it WOULD have been scope growth: converting the alarm to
a PowerShell script with a named interpreter. It would match the shape of the entries that
demonstrably fire, but D5 chose a batch file on a measurement — a `powershell -NoProfile` spawn
costs 200–400 ms on every tool call in the system against 35.5 ms today. A 6–11× regression on the
relay's hottest path is a design reversal, not a wiring repair, and it is not a fix sitting's to
make. If the live check fails, that trade-off is the founder's to weigh.
