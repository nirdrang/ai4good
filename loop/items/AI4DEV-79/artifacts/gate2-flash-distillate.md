SOURCE   loop/items/AI4DEV-79/artifacts/gate2-flash-output.md
REVIEWER opencode-go/deepseek-v4-flash, agent reviewer-flash, variant max (gate 2, draft-code review, reader two of two)
COUNT    9 findings in source → 9 extracted
NOTES    Count line matches (`CODE REVIEW: 9 FINDINGS`). File is not truncated — ends with the
         count line after the "Notes outside the findings" section. The raw file also carries
         three non-numbered notes outside the findings list (D7 env-substitution wording
         conflict, the spike not holding slot claims, and out-of-scope pre-existing items,
         plus a positive note that the one-seam/strip holds under attack) — preserved below
         verbatim since the reviewer's own contract treats a stated concern as never dropped,
         even when not formatted as a numbered finding.

[1] severity: medium   tests/at/harness/db-pool.ts:758,771
    claim: "The D5 personal-block guard (`refusePersonal`) runs on occupy/prepare/stackEnv but NOT on the exported destructive entry points `resetSlotDatabase` and `stopSlotStack` — those run only the identity read."
    unverified-runtime-claim: yes — what `status -o json` prints for a slot config carrying the personal identity while the env states the slot id is not measured; the spike-style probe with a deliberately tampered slot config would settle it.
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:13-16

[2] severity: medium   tests/at/harness/db-pool.ts:1167-1168,1188-1195
    claim: "The spike's \"slot 2 canary is GONE\" criterion can pass vacuously: if `readCanary(2)` throws after a successful reset (while the slot-1 read, which runs first, succeeded), the catch swallows the failure and `resetDone && slot2Canary === null` passes with the canary never read."
    unverified-runtime-claim: yes — post-reset slot-2 db reachability timing; the code fix is plain (require `failure === null` and a non-empty before-snapshot in the criteria), which would settle it by construction.
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:18-21

[3] severity: low   tests/at/harness/db-pool.ts:415-423
    claim: "`mirrorItemTree` copies the item tree's `supabase/` entire including CLI runtime state — `supabase/.temp` (whose `start-secrets/**` the .gitignore itself says \"must NEVER be committed\") and `supabase/.branches` — and deletes the slot's own copies."
    unverified-runtime-claim: yes — whether `supabase/.temp`/`.branches` currently exist in the item tree and what the CLI does with a pre-existing `.temp` at start; settling it is a directory listing of the pool slots and the repo `supabase/` on the dev machine, or excluding/refusing those two directories in the mirror.
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:23-26

[4] severity: low   tests/at/harness/db-pool.ts:687-690,721-724
    claim: "The only instruments that catch the incident's hybrid shape (slot ports + personal containers) are the `supabase_*` container-token scan and the personal-id substring check, and both depend on the CLI printing container names/project ids in status output."
    unverified-runtime-claim: yes — future CLI output shape; not settleable today, worth recording as a named residual with the pinned CLI version.
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:28-31

[5] severity: low   tests/at/harness/db-pool.ts:146-162,351-355
    claim: "`pathClosureProblems` cannot see multi-line array values: `scanConfig` reads one line per setting, so a valid multi-line `sql_paths = [\n \"./x.sql\"\n]` yields value `[` and no paths are extracted."
    unverified-runtime-claim: no — this is a parsing property; a multi-line fixture in the selftest would settle it.
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:33-36

[6] severity: low   tests/at/harness/db-pool.ts:919-920
    claim: "`setup()` writes the `.last-start.json` marker after a `start` that did not stop first, and the S2 transcript itself measured that `supabase start` on an already-running project \"exited zero having created no slot container at all\" — so a setup re-run over a warm slot with a changed tree config writes a matching marker while the stack still runs the old config."
    unverified-runtime-claim: yes — the "already running exits zero" behavior on a slot identity (measured on the personal identity in S2, not on a slot).
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:38-41

[7] severity: low   loop/work/db-slots.ps1:62-78
    claim: "`Get-DbSlotOccupancy` treats a claim pid that exists but is not inspectable as dead — `Get-Process` throws on another user's process — while the runner's own `processIsAlive` (runner.ts:282-290) treats EPERM as alive."
    unverified-runtime-claim: no — this is a semantic asymmetry visible in the code.
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:43-46

[8] severity: low   loop/work/db-slots.ps1:22-27
    claim: "The PowerShell pool-root resolution uses `$env:LOCALAPPDATA` alone, while the harness `poolRoot()` (db-pool.ts:87-94) falls back `XDG_CACHE_HOME` → `tmpdir`; plan D1 promises \"the same base-resolution rule\"."
    unverified-runtime-claim: no.
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:48-51

[9] severity: low   tests/at/harness/db-pool.selftest.ts:138
    claim: "The dead-pid takeover test plants pid 999_999, which is assumed dead but is not provably dead — a busy machine (Linux pid_max 4194304, Windows pid space larger) can legitimately hold that pid."
    unverified-runtime-claim: no.
    raw: loop/items/AI4DEV-79/artifacts/gate2-flash-output.md:53-56

NOTES OUTSIDE THE FINDINGS (verbatim from source, reviewer's own "Notes outside the findings" section):
- "D7's \"slot start and restart inherit the invoking process env\" is not what the code does": `supabaseInvocation` strips every `SUPABASE_*` and `childEnv`'s allowlist drops everything else, so the config's `env(...)` substitutions (Google/GitHub credentials, studio OpenAI key) never resolve in a slot — always the F6 literal string. The plan's own D7 sentence records that literal-string outcome as the measured expectation, and E1's strip is binding and later, so the reviewer reads the code as resolving a genuine tension between the two rulings in favor of E1 — consequence: OAuth-dependent integration ids will always grade the literal-string config on slots, which is unchanged from the old integration path and unexercised today ("named unproved"). Not a numbered finding; flagging the wording conflict for the record.
- "The spike does not hold the slot claims" — it can write canaries while an integration verify occupies the same slot; one-off and slot-scoped, so the damage is limited to a spurious suite failure, not the wall.
- "Out of scope (pre-existing on main, not this diff)": `package.json` `db:start`/`db:stop`/`db:reset` are direct personal-stack paths (`bunx supabase`), and runner.selftest.ts writes a probe file into the repo's `supabase/migrations`. Neither was touched by this branch; they belong to other items if anyone wants them closed.
- "The one-seam and strip hold under attack": every slot CLI act in the changed surface (start/stop/status/reset, setup, spike) routes through `runSupabaseCli` → `supabaseInvocation`; the `SUPABASE_*` strip is case-insensitive and cannot be defeated by `Supabase_Project_Id` in the parent (the allowlist drops it before the positive value is spread last, and the seam asserts the result); `bun --no-env-file` and the slot working directory are both set. The loop tier never enters the integration block and the drill refusal reports as infrastructure (exit 3, "INFRASTRUCTURE:"), as ruled. The claim is stored in the same `lock` variable `cleanupRun` releases, before `prepare()` can throw. The nine named selftests plus E8's two companions are all present and their passing directions are meaningful; the marker crash-window walk in `prepare()` is safe in every direction.
