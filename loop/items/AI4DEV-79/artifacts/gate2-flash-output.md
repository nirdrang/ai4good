I have the full picture now. Here is my review.

---

# CODE REVIEW — AI4DEV-79 (parallel local DB slot pool)

**Scope read:** `tests/at/harness/db-pool.ts`, `tests/at/harness/runner.ts`, `tests/at/harness/db-pool.selftest.ts`, `loop/work/db-slots.ps1`, `.claude/skills/work/SKILL.md`, the plan `loop/items/AI4DEV-79/plan.md` (as amended through §7/§8), and the three committed transcripts. Judged against the amended plan; the S8 integration run and the gate-1 [10] loop oracle are goal-phase work and their absence at draft is expected, not a defect.

Severity scale: **High** = defeats the wall or destroys data; **Medium** = real defect with a concrete failure; **Low** = edge, robustness, or plan-conformance gap with narrow or loud failure.

## Findings

**[1] medium**    `tests/at/harness/db-pool.ts:758,771`
    claim: The D5 personal-block guard (`refusePersonal`) runs on occupy/prepare/stackEnv but NOT on the exported destructive entry points `resetSlotDatabase` and `stopSlotStack` — those run only the identity read.
    why it matters: Plan D5 says the guard runs "before anything destructive, every time" and names "reset" explicitly; the two exports that can stop or reset a stack (the spike calls `resetSlotDatabase(2)` directly) rely solely on `proveSlotTarget`. That read's port+issuer checks are exactly the combination the incident proved cannot distinguish a hybrid — the read would pass a tampered slot config carrying the personal project id and personal ports as long as the CLI reports those ports, and only the container-token scan stands between that and a destructive act. The runner's flow is guarded (occupy/prepare), so the exposure is the exported surface and the spike path, on a pool-root directory any local process can write.
    unverified-runtime-claim: yes — what `status -o json` prints for a slot config carrying the personal identity while the env states the slot id is not measured; the spike-style probe with a deliberately tampered slot config would settle it.

**[2] medium**    `tests/at/harness/db-pool.ts:1167-1168,1188-1195`
    claim: The spike's "slot 2 canary is GONE" criterion can pass vacuously: if `readCanary(2)` throws after a successful reset (while the slot-1 read, which runs first, succeeded), the catch swallows the failure and `resetDone && slot2Canary === null` passes with the canary never read.
    why it matters: A green transcript can then print "THE SPIKE PASSED" with the vanishing-canary instrument — the exact instrument gate-1 [7] added to prevent a no-op reset from satisfying the done-criterion — unread, e.g. after a transient post-reset db-unreachable. The same criterion block also passes the snapshot comparison when the `name=<personal>` docker filter matches zero objects before and after (removed containers), which is a trivially identical empty snapshot. Both directions let the wall look proven while the evidence that proves it was not taken.
    unverified-runtime-claim: yes — post-reset slot-2 db reachability timing; the code fix is plain (require `failure === null` and a non-empty before-snapshot in the criteria), which would settle it by construction.

**[3] low**    `tests/at/harness/db-pool.ts:415-423`
    claim: `mirrorItemTree` copies the item tree's `supabase/` entire including CLI runtime state — `supabase/.temp` (whose `start-secrets/**` the .gitignore itself says "must NEVER be committed") and `supabase/.branches` — and deletes the slot's own copies.
    why it matters: On any dev checkout where `supabase start`/`functions serve` ran from the repo (the S2 transcript documents exactly that: the repo was used as a project cwd), the personal stack's runtime secrets and branch state are persisted into a slot directory that outlives items, and the running slot's own `.temp` is wiped on every occupancy. Empirically the setup run still produced correct slot identities, so the CLI does not appear to consume the copied secrets — but the plan's own "state is never inherited" rule is punctured on the source side, and the persistent copy is a leak the E3 "entire" ruling did not contemplate (it was about config-path coverage).
    unverified-runtime-claim: yes — whether `supabase/.temp`/`.branches` currently exist in the item tree and what the CLI does with a pre-existing `.temp` at start; settling it is a directory listing of the pool slots and the repo `supabase/` on the dev machine, or excluding/refusing those two directories in the mirror.

**[4] low**    `tests/at/harness/db-pool.ts:687-690,721-724`
    claim: The only instruments that catch the incident's hybrid shape (slot ports + personal containers) are the `supabase_*` container-token scan and the personal-id substring check, and both depend on the CLI printing container names/project ids in status output.
    why it matters: Today that is non-vacuous — both committed transcripts show the "Stopped services: [supabase_…]" line in every status invocation of the pinned CLI 2.110.0, and the spike proved the read. But a CLI version that stops printing container names would let the hybrid pass the read on ports+issuer alone, which is precisely the combination the incident showed cannot distinguish the target. This is a defense-in-depth residual on the corroborating instrument (E6), not a current breach.
    unverified-runtime-claim: yes — future CLI output shape; not settleable today, worth recording as a named residual with the pinned CLI version.

**[5] low**    `tests/at/harness/db-pool.ts:146-162,351-355`
    claim: `pathClosureProblems` cannot see multi-line array values: `scanConfig` reads one line per setting, so a valid multi-line `sql_paths = [\n "./x.sql"\n]` yields value `[` and no paths are extracted.
    why it matters: Gate-1 [6]/E3's fail-closed closure ("refuse on active references outside `supabase/` — no stack starts half-provisioned") is silently bypassed by a formatting choice: an item that reformats the array and points at a file outside `supabase/` would start a slot missing that file and grade against it. The overlay side's limitation is safe (verbatim copy); the closure side is not. The repo's own config is single-line today.
    unverified-runtime-claim: no — this is a parsing property; a multi-line fixture in the selftest would settle it.

**[6] low**    `tests/at/harness/db-pool.ts:919-920`
    claim: `setup()` writes the `.last-start.json` marker after a `start` that did not stop first, and the S2 transcript itself measured that `supabase start` on an already-running project "exited zero having created no slot container at all" — so a setup re-run over a warm slot with a changed tree config writes a matching marker while the stack still runs the old config.
    why it matters: That is exactly the D3 crash window the marker exists to close, reopened by the one entry point that starts without stop-then-start: the next occupancy sees an equal hash, skips the restart, and grades the previous config's behavior. `prepare()` is safe (stop-then-start). Companion observation: a matching marker over a cold/crashed stack makes every runner occupancy refuse until a human re-runs setup — loud and actionable, but the help text attributes it to "pool never set up", which is misleading for a rebooted machine.
    unverified-runtime-claim: yes — the "already running exits zero" behavior on a slot identity (measured on the personal identity in S2, not on a slot).

**[7] low**    `loop/work/db-slots.ps1:62-78`
    claim: `Get-DbSlotOccupancy` treats a claim pid that exists but is not inspectable as dead — `Get-Process` throws on another user's process — while the runner's own `processIsAlive` (runner.ts:282-290) treats EPERM as alive.
    why it matters: `Release-DbSlot`'s "refuses while a live occupancy claim exists" ruling (gate-1 [2]) is only as strong as this liveness test: on a multi-user machine, or when a pid was recycled to a process the coordinator cannot inspect, the sweep would delete a reservation under a live verify. Single-user dev box: no practical effect today.
    unverified-runtime-claim: no — this is a semantic asymmetry visible in the code.

**[8] low**    `loop/work/db-slots.ps1:22-27`
    claim: The PowerShell pool-root resolution uses `$env:LOCALAPPDATA` alone, while the harness `poolRoot()` (db-pool.ts:87-94) falls back `XDG_CACHE_HOME` → `tmpdir`; plan D1 promises "the same base-resolution rule".
    why it matters: On a machine where LOCALAPPDATA is unset (service contexts), the PowerShell half errors loudly (Join-Path on null) rather than sharing the harness's root — a loud failure, not a silent fork, but the two halves would disagree about where the pool lives on exactly the unusual machines the fallback chain exists for.
    unverified-runtime-claim: no.

**[9] low**    `tests/at/harness/db-pool.selftest.ts:138`
    claim: The dead-pid takeover test plants pid 999_999, which is assumed dead but is not provably dead — a busy machine (Linux pid_max 4194304, Windows pid space larger) can legitimately hold that pid.
    why it matters: If 999999 is ever a live process, the test fails loudly (occupy refuses) — the passing direction stays honest, so this is a flake risk, not a false green; the same pattern pre-exists in runner.selftest.ts:161, so both would flake together. The live-holder test (process.pid) is provably live and is the meaningful half.
    unverified-runtime-claim: no.

## Notes outside the findings

- **D7's "slot start and restart inherit the invoking process env" is not what the code does**: `supabaseInvocation` strips every `SUPABASE_*` and `childEnv`'s allowlist drops everything else, so the config's `env(...)` substitutions (Google/GitHub credentials, studio OpenAI key) never resolve in a slot — always the F6 literal string. The plan's own D7 sentence records that literal-string outcome as the measured expectation, and E1's strip is binding and later, so I read the code as resolving a genuine tension between the two rulings in favor of E1 — consequence: OAuth-dependent integration ids will always grade the literal-string config on slots, which is unchanged from the old integration path and unexercised today ("named unproved"). Not a numbered finding; flagging the wording conflict for the record.
- **The spike does not hold the slot claims** — it can write canaries while an integration verify occupies the same slot; one-off and slot-scoped, so the damage is limited to a spurious suite failure, not the wall.
- **Out of scope (pre-existing on main, not this diff):** `package.json` `db:start`/`db:stop`/`db:reset` are direct personal-stack paths (`bunx supabase`), and runner.selftest.ts writes a probe file into the repo's `supabase/migrations`. Neither was touched by this branch; they belong to other items if anyone wants them closed.
- **The one-seam and strip hold under attack:** every slot CLI act in the changed surface (start/stop/status/reset, setup, spike) routes through `runSupabaseCli` → `supabaseInvocation`; the `SUPABASE_*` strip is case-insensitive and cannot be defeated by `Supabase_Project_Id` in the parent (the allowlist drops it before the positive value is spread last, and the seam asserts the result); `bun --no-env-file` and the slot working directory are both set. The loop tier never enters the integration block and the drill refusal reports as infrastructure (exit 3, "INFRASTRUCTURE:"), as ruled. The claim is stored in the same `lock` variable `cleanupRun` releases, before `prepare()` can throw. The nine named selftests plus E8's two companions are all present and their passing directions are meaningful; the marker crash-window walk in `prepare()` is safe in every direction.

`CODE REVIEW: 9 FINDINGS`
