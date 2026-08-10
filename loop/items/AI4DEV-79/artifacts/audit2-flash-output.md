All evidence is gathered and every box has been traced. Here is the audit.

---

# AUDIT — AI4DEV-79 (parallel local DB slot pool), round two

**Method note.** This cage has no git tooling and the worktree's gitdir (`C:/Users/nirdr/Downloads/ai4good/.git/worktrees/…`) sits outside my readable scope, so every commit-level fact is COULD-NOT-VERIFY and I say exactly which below. Everything file-level I traced character by character: all 1,642 lines of `db-pool.ts`, the runner seam and lock protocol, the PowerShell helpers, the selftests, all seven transcripts, both gate-2 distillates, the audit-round distillates, and the state file.

## Box 1 — Every adopted ruling is implemented as ruled: **PASS**

- **§7 [1]–[15]** — all present. [1] marker `slot-N/.last-start.json` written only after a successful start and compared by hash (`db-pool.ts:113–116, 1164–1175`; setup writes it at 1299); [2] all three hardenings — ownership-checked release delete (`db-slots.ps1:229–231`), refusal under live occupancy (247–253), post-claim reservation re-read with release-then-refuse (`db-pool.ts:833–851`); [3] `TakeoverPolicy` + `dead-pid-only` (`runner.ts:315, 322–328, 384`; pool passes it at `db-pool.ts:828`); [4] drill refusal (`runner.ts:1235–1241`) — I verified nothing in the tree invokes `--tier drill` (the `loop/drills/` machinery is a different "drill" concept; `run-drills.ps1:24` uses the actor name `'drill'`, never the tier flag); [5] generalized port rule (`db-pool.ts:214–299`); [6] fail-closed path closure (`446–490`); [7] vanishing slot-2 canary (spike criteria, `db-pool.ts:1592`); [8] superseded by E5; [9] S8 exists; [10] oracle (below); [11] the pool claim goes into the same `lock` variable `cleanupRun` releases (`runner.ts:1254–1256, 1124–1132`); [12] fail-closed branch parser (`663–672`); [13] `AT_LOCK_DIR` (`runner.ts:275–280`); [14] my own scan of the item directory found zero `eyJ`+15 token shapes in any committed transcript; [15] `ci.yml:44` is exactly `runs-on: ${{ vars.CI_RUNNER_LABEL || 'ubuntu-latest' }}`.
- **§8 E1–E9** — E1's one seam is `supabaseInvocation` (`runner.ts:601–616`): positive `SUPABASE_PROJECT_ID`, strip-and-assert of every other `SUPABASE_*` (the allowlist at 129–166 carries none), `bun --no-env-file` via `supabaseArgs` (551–554), cwd = `--workdir`. E2 amended-unblocked (plan 612–614). E3 as narrowed by [T3]: `MIRROR_EXCLUSIONS = ['.temp','.branches','config.toml']` (`db-pool.ts:507`) with matching closure refusal (478–485). E4 listener-only overlay (214–229). E5 zero-touch spike with mandatory hostile condition (`db-pool.ts:1460–1611`). E6 strict suffix scan (`foreignContainerNames` 939–942, `localStackProblems` + `carriesPersonal` 1046–1073). E7 fail-closed bias throughout. E8's two extra selftests present (`db-pool.selftest.ts:248–260, 373–377`). E9's declaration exists (plan 643–647, PHASE-STATE anomalies) and `watch-tip.sh:2` is indeed a self-rewriting base pointer — current base 2e2a215 matches the audit push it names.
- **§9 [T1]–[T13], [F1]–[F9], notes, X1–X5** — all present in their *ruled* shapes. [T1] `identified()` (`runner.ts:469–484`) with one bounded re-read and loud refusal naming the file, applied both before and inside the takeover gate (493, 513). [T2] positive-token evidence (`ownContainerNames` 965–968; destructive path requires ≥1 own token, 1075–1082) plus docker corroboration before every reset (995–1007, called at 1107); the verify-first measurement is recorded in the code comment (948–963) and in X4. [T4] spike occupies both slots through `occupy` and releases both in `finally` (1511–1513, 1569–1573). [T5] override refusal naming the holder (775–793). [T6] sentinel claim key port 0 (139–141, 828, 710), PowerShell glob matches (122). [T7]/[F1] `refusePersonalSlotConfig` on reset/stop/stackEnv (1099, 1114, 1205). [T8] inspector pins exactly 8083, other values fall to the generic rule (284–295). [T9]'s residual is recorded beside the sweep helper (`db-slots.ps1:241–246`). [T10]+X1 — the bounded wait and reject-on-unreadable are in `Read-DbSlotReservationWait`/`Reserve-DbSlot` (86–105, 199–204) with the `NOT RULED BY GATE 2` marker (70–74); the 5/5-vs-8/8 measurement comment matches X1 verbatim. [T11] config excluded from the mirror + immediate write + missing-config refusal naming both causes (811–823, 1159–1162). [T12]/[F2] both criteria in the spike (1589, 1596–1599). [T13] symlink refusal (514–559). [F5] multi-line-array closure refusal (452–459). [F6] setup stops before starting (1295–1298). [F7] not-found-vs-everything-else liveness (136–144). [F8] full resolution chain (24–29). [F9] provably-dead real child pid (68–72, used at 168). Notes 1–4 ruled as recorded, including D7's supersession sentence (plan 167–170). X4's residual is in the code comment (959–963); X5's wording alignment verified (selftest 345/354 vs guard 362).
- **§10 [A1]–[A5], [AF1], AX1–AX8** — [A1] record fix in place (plan §4 S8 rewritten, 303–315). [A2] `readReservationStrict` (622–646) used on the override path (784) and in the post-claim re-read (833–851) with release-before-refusal (AX1); `readPool`'s view stays lenient (721); selftest grew (274–291). [A3] evidence port from post-prepare status (1233–1241, 1253–1258); selftest asserts it (517–544). [A4] `Get-DbSlotOccupancy` waits out the window and reports unreadable as live with the `readable` field (121–150); `Release-DbSlot` refuses naming the file (249–251). [A5] whole-token `portValue` (196–200), unparseable = problem in both the guard (353–359) and the overlay (266, 280–283); `generateSlotConfig` rewrites underscored integers whole (322, AX5); selftests grew (349–371, 417–424, AX7). [AF1] verified: `audit-flash-output.events.jsonl` is absent from the artifacts directory, and my own `eyJ`+15 scan of every artifact file returns zero — the only matches in the record are truncated "eyJ..." mentions. AX2–AX8 all match the code.

## Box 2 — The diff stays inside its declared scope: **COULD-NOT-VERIFY**

No git access, so the byte-level diff against the merge base and the content of commits bb14267 / 15ada2a / 2e2a215 / 63dfe3d cannot be checked from this seat. Every observable file the declared scope names is present and nothing outside it shows up in the tree except the audit2-* re-run launch residue (pid/stderr logs — expected per PHASE-STATE's recipe) — and one file that is itself a finding (below). The E9 declaration for `watch-tip.sh` exists, so those hunks are declared as instructed. The tree-level content each commit is said to carry is present and consistent with the record's descriptions.

## Box 3 — Every stated fact about the code is true: **PASS**

Traced character by character where it matters: `.env` line 1 is `SUPABASE_PROJECT_ID="poancmeitlmxejofwzuu"`; `supabase/seed.sql` does not exist (F4); `readHolder` returns `{}` for an unreadable file and `holderIsLive({})` is false (the [T1] fact); the `parsed === null` refusal branch precedes the inspector case (the [T8] half-rejection fact, true at db-pool.ts:280–284); `dead-pid-only` never displaces a live holder (the [T9] rejection fact, true at runner.ts:322–328 and db-pool.ts:828); the spike's canary read order is slot-1-then-slot-2 (the [F2] fact, 1559–1560); `expected.ts:235–236` emits exactly "carries no declaration for the integration tier (declared: loop)"; ci.yml:44; the `expectedMigrations`/`readStackStatus`/`resetLocalDatabase`/`proveMigrationsReplayed` re-signing (D9) — all confirmed.

## Item-specific boxes

- **Oracle (gate-1 [10], X3): PASS (readable half).** Both transcripts exist and are line-for-line identical normalized outputs (43 lines each, same `<TMPPATH>`/`<ROOT>` folding, same `EXPECTED:` match line). The committed `oracle-loop.diff` contains only its 18-line header, which states the baseline (c11e352), why it is the baseline (main ten commits ahead, four ids moved), and "RESULT: EMPTY" — the artifact itself is genuinely empty of hunks. Git facts (c11e352 being the merge base, ten commits, four ids) are COULD-NOT-VERIFY.
- **X2's fact-check: PASS.** `tests/at/expected/req-001.json` declares the loop tier only (`"tiers": { "loop": … }` — one member). `integration-run.txt` shows every element X2 claims: occupancy claimed and released ("occupancy none" before and after), prepare with both [T2] instruments (container-token line 56, docker corroboration line 58), the ruled evidence line naming the slot (line 60), the suite executed against the slot env (37 ids), the personal snapshot IDENTICAL (line 123). The 28+9 = 37 arithmetic is exact (I counted the 28 `sut-missing` pendings and the 9 stubbed-capability refusals in the transcript). No record file claims an integration-tier green — plan §5:311, PHASE-STATE:84, and the transcript's own "0 green" / "DOES NOT PROVE".
- **Spike re-proof: PASS.** `spike-isolation-2.txt` shows a non-empty BEFORE snapshot (11 containers, 3 volumes, line 35), no `STOPPED:` line in the run body, both canary reads printed (58–59), the hostile variable present (15), the pre-destructive identity read (50, 54), and IDENTICAL after (76). The spike code's criteria now include both gate-2 additions (1589, 1596–1599). The transcript's own six-item criterion list predates [T12]/[F2] — no record claims it shows them. The incident transcript supports §8's facts (volume recreated 22:04:38Z, bind to 56322 failed, slot-2 canary survived, `.env` root cause); the §8 "observed at sitting open" correction (container recreated 22:30:25Z, volume 22:25:17Z) matches the re-proof's snapshot lines 23 and 32 exactly.
- **Rejected [T9] / half-rejected [T8]: PASS.** Both written reasons cite code facts that are true in the current tree (occupancy claim as serializer with dead-pid-only; refusal branch ordered before the inspector case).
- **Verbatim quotes: PASS.** I spot-checked all 13 terra claims and all 9 flash claims plus the four notes in §9 against the two distillates, and the [A1]–[A5]/[AF1] claims against the audit distillates — all verbatim, including punctuation and backticks. Count lines match both distillates (13/9).

## Findings

Severity scale (mine): **high** = defeats a ruled protection or puts a live credential inside the record; **medium** = real leak/rule violation with a concrete failure; **low** = record/evidence-pinning concern with narrow or loud failure.

```
[1] severity: high    loop/items/AI4DEV-79/artifacts/audit2-flash.events.jsonl:95
    claim: the audit RE-RUN's live tool-call log (the audit2- artifact this sitting's own
           recipe creates) records raw tool outputs verbatim and already contains the
           complete repo `.env` content, including both live SUPABASE_PUBLISHABLE_KEY JWT
           tokens, inside the item's artifacts directory at this snapshot.
    why it matters: this is the exact [AF1] hazard, one round later. Gate-1 [14] makes "no
           eyJ token" a done-criterion for every committed transcript in this record, and
           [AF1]'s remedy was that the events log stay out of the record (the round-one
           file was deleted by the runner's cleanup). The round-two file EXISTS on disk
           here — my scan finds the full tokens at line 95 — so whether the close commits
           it decides whether a live credential lands in the record. If it is committed,
           gate-1 [14] is violated with token material; if it is excluded at close, nothing
           is violated, exactly as [AF1] framed it. The close must run the same verification
           [AF1] prescribed and exclude or delete this file.
    unverified-runtime-claim: yes — whether the file is tracked/committed at the pinned
           commit, and whether the runner's close-time cleanup deletes it. Settling it:
           `git ls-files` / `git status` on the artifacts directory at close, plus a
           token-shape scan of every file that lands in the commit.

[2] severity: low    loop/items/AI4DEV-79/integration-run.txt:13
    claim: the item's only end-to-end proof of the changed path ran on a tree whose
           uncommitted delta is never identified — the transcript discloses "tree state:
           DIRTY" but nothing in the record says which files were dirty.
    why it matters: if the pool code itself was among the uncommitted files, the S8 proof
           covers a tree that was never committed, and X2's "the changed path executes end
           to end, met and committed" is not fully pinned to the committed head. The spike
           transcript's postscript sets the house pattern — it names its one uncommitted
           edit and says it was committed with the transcript; the S8 transcript does not.
           The record is not false (the dirt is disclosed), but the proof's object is
           under-specified.
    unverified-runtime-claim: yes — what the dirty delta was. Settling it: the sitting's
           own notes or a re-read of the run's git state at the time; short of that, a
           postscript naming the delta, on the spike transcript's pattern.

[3] severity: low    loop/items/AI4DEV-79/pr-body.md:14
    claim: the pull-request body still reads "Status: planned; nothing is built yet" while
           the branch it describes is fully built, ruled, reviewed and audited.
    why it matters: posted as-is, the PR states the item is unbuilt. The body's own text
           says the merge ruling "will be posted on this pull request before merge", so the
           merge sitting is the natural place to supersede it — but nothing in the record
           says it will be, and [A1] established that this record treats a stale statement
           as record-false. Low confidence this is a defect rather than the expected merge-
           time update; naming it so the merge sitting can't miss it.
    unverified-runtime-claim: no
```

## Observations, outside the findings

- Git-level facts throughout (c11e352 as merge base, main ten commits ahead, four ids moved, bb14267's isolation, 15ada2a's scope, 2e2a215's ordering, watch-tip churn commits) are COULD-NOT-VERIFY from this seat — the tree-level content each describes is present and consistent.
- PHASE-STATE's execution claims ("284 tests", all four suites green, the A4 before/after measurements of 21 ms and ~1.3 s) are pinned to the required CI check and the recorded measurements, not re-derived here; the ~1.3 s is consistent with the code's 40×25 ms bounded wait plus overhead.
- Pre-existing and out of scope, named once: the repo-root `.env` (tracked, not gitignored — `.gitignore:34–36` ignores only `.env.local`) carries live JWT tokens; that is the root the [AF1]-class hazard keeps returning to. Also pre-existing on main per flash's gate-2 note 3: `package.json` `db:start/db:stop/db:reset` and the runner.selftest.ts migrations probe — the coordinator already has them filed.
- The spike transcript's six-item criterion list predating [T12]/[F2] is consistent with the timeline and contradicts no record claim; the §7–§9 line citations that drifted after the fixes were already ruled as left-as-written (flash observation (a), recorded in §10 [AF1]).

**Bottom line:** every adopted ruling — gate-1 [1]–[15], E1–E9, [T1]–[T13], [F1]–[F9], X1–X5, [A1]–[A5], [AF1], AX1–AX8 — is implemented in its ruled shape; the rejection rulings rest on true code facts; the quotes are verbatim; the transcripts support every claim the record makes about them; X2's fact-check and the 28+9 arithmetic hold; and no record claims an integration-tier green. Three findings stand: the re-run's credential-bearing events log present in the tree at this snapshot (the [AF1] class, disposition at close unverified), the S8 proof's unidentified dirty delta, and the stale PR-body status line.

AUDIT: 3 FINDINGS