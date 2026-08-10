I have completed the full trace. Let me compile the audit.

---

# AUDIT — AI4DEV-79 (parallel local DB slot pool)

**Method note.** I have no shell/git tooling in this cage, so the byte-level diff against the merge base and every commit-level claim (bb14267's isolation, 1c91bba's ordering, c11e352 being the merge base, main being ten commits ahead) are **COULD-NOT-VERIFY** — I state exactly which below. Everything file-level I traced character by character.

## Box verdicts

**1. Rulings implemented as ruled — PASS, except the git-level halves of X1/X3 noted below.**

- **§7 [1]–[15]:** [1] marker `slot-N/.last-start.json` written only after successful start, compared by hash (`db-pool.ts:1066–1077`, `setup` 1180); [2] all three hardenings — `Release-DbSlot` ownership-checked delete (`db-slots.ps1:210–212,233`), refusal under live occupancy (`db-slots.ps1:228–231`), `occupy` re-reads the reservation after the claim (`db-pool.ts:744–753`); [3] `TakeoverPolicy` + `dead-pid-only` (`runner.ts:315,384`, `db-pool.ts:739`), existing call sites default (`runner.selftest.ts:163,176,200`); [4] drill refusal `runner.ts:1235–1241` (and I verified nothing invokes `--tier drill` — only type definitions, oracle-capability tests, and an unrelated drill-actor event in `loop/drills/run-drills.ps1:24`); [5] generalized port rule (`db-pool.ts:240–280`) and broad D5 scan (`317–339`); [6]/E3 mirror-entire + closure (`415–459`, `516–540`); [7] vanishing slot-2 canary (spike criteria + transcript); [8] superseded by E5 — the re-proof's `finally` releases both claims (`1450–1455`); [9] S8 exists; [10] oracle (below); [11] `lock = occupancy.claim` in the same variable `cleanupRun` releases (`runner.ts:1256`, `1124–1132`); [12] fail-closed branch parser (`db-pool.ts:575–584`); [13] `AT_LOCK_DIR` (`runner.ts:275–280`); [14] transcripts clean (grep for `eyJ`/`sb_`/raw postgres URLs over the item directory found nothing in the committed transcripts); [15] `ci.yml:44` `runs-on: ${{ vars.CI_RUNNER_LABEL || 'ubuntu-latest' }}` verified.
- **§8 E1–E9:** E1/D13 one seam `supabaseInvocation` (`runner.ts:601–616`: positive `SUPABASE_PROJECT_ID`, strip-and-assert of every other `SUPABASE_*`, `--no-env-file`, cwd = workdir); E2 amended-unblocked (plan.md:606–608); E3 narrowed by [T3] (`MIRROR_EXCLUSIONS = ['.temp','.branches','config.toml']`, `db-pool.ts:476`, closure refusal `447–454`); E4 listener-only overlay (`LISTENER_PORTS` `196–207`); E5 zero-touch spike with hostile condition mandatory (`1341–1492`); E6 strict `supabase_*` suffix scan (`841–870`, `941–991`); E7 fail-closed bias (unknown token → loud refusal, `843`); E8 the two extra selftests present (`db-pool.selftest.ts:242,308`); E9 declaration exists (plan.md:637–641, PHASE-STATE anomalies).
- **§9 [T1]–[T13], [F1]–[F9]:** T1 unidentifiable-holder guard with bounded re-read, refusing and naming the file, applied both before and inside the takeover gate (`runner.ts:469–484,493,513`); T2 positive token evidence on destructive reads (`db-pool.ts:977–984`) plus docker corroboration before every reset (`897–909`, called at `1009`), measurement recorded (`850–866`) and corroborated by the integration transcript's own token lines; T3/T11 mirror exclusions + immediate config write (`1061–1064`) + missing-config refusal naming both causes and the one-command repair (`722–734`); T4 spike occupies both slots through `occupy` and releases in `finally` (`1392–1394,1450–1452`); T5 override refusal when the reservation names a different/derivable item (`682–704`); T6 sentinel claim key `slotClaimKey` port 0 (`139–141`), used by `occupy` and `readPool` (`622,739`), PowerShell glob matches (`db-slots.ps1:106`); T7/F1 the three exported entry points each run `refusePersonalSlotConfig` (`1001,1016,1107`); T8 inspector pins exactly 8083, other values fall to the generic rule (`265–276`, selftest `352–368`); T9-rejected residual comment beside the sweep helper (`db-slots.ps1:222–227`); T10+X1 (below); T12/F2 the two spike criteria present (`1470`, `1477–1480`); T13 symlink refusal (`483–497,521–528`, selftest `426–440`); F5 multi-line-array closure refusal with named rewrite (`421–427`, selftest `376–387`); F6 setup stops before starting (`1176–1177`); F7 `Get-DbSlotOccupancy` distinguishes not-found from every other failure (`db-slots.ps1:117–125`); F8 full resolution chain (`db-slots.ps1:24–29`); F9 provably-dead real child pid (`db-pool.selftest.ts:68–72`). Note 1's supersession recorded (plan.md:169–170, 860–867); Note 2 ruled at T4; Note 3 named for the coordinator (PHASE-STATE:83–87); Note 4 recorded.
- **X1:** the `NOT RULED BY GATE 2` marker, the bounded one-second wait (40×25 ms) and the reject-on-unreadable are all in the tree exactly as X1 describes (`db-slots.ps1:68–98,180–188`), and the comment's 5/5-vs-8/8 measurement matches X1 verbatim. **COULD-NOT-VERIFY:** that commit bb14267 contains *only* this (no git).
- **X2:** `tests/at/expected/req-001.json` declares the loop tier only — verified (the `tiers` object has one member). The runner refuses before any test runs (`runner.ts:1190–1198`; message "carries no declaration for the integration tier (declared: loop)" at `expected.ts:235–236`). `integration-run.txt` shows every element X2 claims: occupancy and release ("occupancy none" before and after), prepare (mirror/regenerate/reset/migration proof, lines 56–59), both [T2] instruments (container-token line 56–57, docker corroboration line 58), the ruled evidence line naming the slot (line 60), the suite executed against the slot env (37 ids, lines 63–103), the personal snapshot IDENTICAL (line 123). No record file claims an integration-tier green — the transcript says "0 green" and "DOES NOT PROVE", PHASE-STATE:81–82 states it, plan §5's amended row does not claim it. The 28+9 arithmetic (28 sut-missing pendings, 9 stubbed-capability refusals = 37) matches the transcript exactly.
- **X3:** `oracle-loop.diff` is header-only — genuinely empty; `oracle-loop-main.txt` and `oracle-loop-branch.txt` exist and are line-for-line identical, both normalized (`<TMPPATH>`, `<ROOT>`), each ending in the `EXPECTED:` line that the runner prints only on the match path — consistent with the header's exit-code-0 claim. **COULD-NOT-VERIFY:** the git facts (c11e352 as merge base, ten commits, four ids moved) — no git access; they are the record's declared baseline.
- **X4:** residual comment at `ownContainerNames` (db-pool.ts:861–865) names the config coupling; both committed transcripts show the tokens appear. **X5:** guard emits "is inside the personal stack's port block" (`db-pool.ts:331`) and the selftest asserts that exact regex (`db-pool.selftest.ts:304`) — aligned.

**2. Diff scope — COULD-NOT-VERIFY at byte level** (no git), but every observable change in the declared files traces to a ruling: the seam, the policy parameter, `AT_LOCK_DIR`, the re-signed helpers (`readLocalConfig:234`, `readStackStatus:644`, `resetLocalDatabase:904`, `proveMigrationsReplayed:878`, `expectedMigrations:828`), the integration hook, the drill refusal; the loop tier never enters either stack block (`runner.ts:1214,1230–1275`), and the oracle diff is the designed evidence for behavioral identity. E9's declaration for `watch-tip.sh` exists (plan.md:637–641, PHASE-STATE anomalies), and the file itself is a self-rewriting base-pointer watcher (`watch-tip.sh:2`).

**3. Cited facts in rejection rulings — PASS.** [T9]'s reason: the occupancy claim is the serializer — `dead-pid-only` never displaces a live holder (`runner.ts:322–328`, `db-pool.ts:739`), `Release-DbSlot` refuses while a live claim exists, and the residual comment is in place. [T8]'s reason: a `!literal` refusal branch is ordered before the inspector case — true in the current tree (`db-pool.ts:261` precedes `265`), and the fix pins 8083 exactly as ruled. (The citation "db-pool.ts:242" is a pre-fix line number — see the observation below; the fact it cites holds.)

**4. Verbatim quotes — PASS.** All 13 terra claims and all 9 flash claims in §9 match the corresponding distillates byte-for-byte (spot-checked all 22), and both raw outputs carry the matching count lines (`CODE REVIEW: 13 FINDINGS`, `CODE REVIEW: 9 FINDINGS`; gate-1's `PLAN REVIEW: 15 FINDINGS` also verified). The four flash notes match the distillate's notes section.

**5. Spike re-proof non-vacuity — PASS.** `spike-isolation-2.txt` shows a non-empty BEFORE snapshot (11 containers, 3 volumes, line 35), no `STOPPED:` line in the main run, and both canary reads printed (line 58–59). The current spike code's criteria include both gate-2 additions (db-pool.ts:1470, 1477–1480). The transcript's own criterion list shows six items — it predates the gate-2 fix, which no record contradicts.

**6. Stated facts about code — PASS on every one I could trace** (listed in the boxes above: `.env` line 1, ci.yml:44, seed.sql absence, readHolder `{}` semantics, `holderIsLive({})` false, spike read order slot-1-before-slot-2, PowerShell liveness semantics, resolution chains, sentinel glob match, expected.ts refusal wording, X5 wording).

## Findings

**Severity scale (mine):** high = the record or tree defeats a ruled protection; medium = a real leak or rule violation with a concrete failure; low = a record/evidence concern with narrow or loud failure.

```
[1] severity: low    loop/items/AI4DEV-79/artifacts/audit-flash-output.events.jsonl:75
    claim: the current audit sitting's live tool-call log records raw tool outputs verbatim
           and already contains the complete repo `.env` content, including two live
           SUPABASE_PUBLISHABLE_KEY JWT tokens (eyJ...), inside the item's artifacts
           directory.
    why it matters: the item's own ruling gate-1 [14] makes "no eyJ token" a done-criterion
           for every committed transcript in this record, and PHASE-STATE's recipe commits
           the audit sitting's tool-call artifacts alongside the outputs; if this file or its
           content lands in the record, the rule is violated and a live credential value is
           committed. If it stays untracked and is excluded at close, nothing is violated.
    unverified-runtime-claim: yes — whether this file is tracked/committed at the sitting's
           close; settling it is `git status`/`git ls-files` on the item directory at close,
           plus excluding the events log (or redacting it) when the audit outputs are
           committed.
```

## Observation (not a finding)

- Line-number citations in §7–§9 (e.g. "db-pool.ts:242", "db-pool.ts:1167–1194", "runner.ts:440") were written against the pre-fix file; several no longer match the post-fix tree (the `!literal` branch is now at 261). The cited *facts* all hold structurally, and the citations were true when written — the merge sitting should not treat a future reader's miss as a defect.
- Git-level claims — c11e352 as merge base, main ten commits ahead, bb14267 containing only the T10 completion, the "1c91bba before any code change" ordering — are COULD-NOT-VERIFY from this cage (no git tooling). The tree-level content each describes is present and consistent.

**Bottom line:** every adopted ruling is implemented as ruled, the quotes are verbatim, the transcripts support every claim the record makes about them, the rejection rulings rest on true facts, and no record claims an integration-tier green. The one finding is the audit sitting's own credential-bearing event log, which the close must keep out of the record.

AUDIT: 1 FINDING