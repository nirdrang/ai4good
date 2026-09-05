## Scores

| Criterion | W | X | Y | Z |
|---|---|---|---|---|
| 1. Factual accuracy | 3 | 3 | 1 | 1 |
| 2. Coverage of the notes | 5 | 4 | 0 | 3 |
| 3. No unsupported claims | 5 | 5 | 4 | 5 |
| 4. Dependency map | 5 | 5 | 2 | 5 |
| 5. Reader load | 4 | 5 | 3 | 4 |
| **Total** | **22** | **22** | **10** | **18** |

## Criterion 1 — errors

**W (2)**

1. **W.** “The v2 way of work … uses none of the ceremony except `mechanical`.” `/controller` still calls `Set-HeldItem` / `Clear-HeldItem` from `loop/work/work-lib.ps1` (`.claude/skills/controller/SKILL.md` 71–72, 190), materialises “as `/work` describes it” (46–47), and tells a cloud VM to run `bun tests/at/harness/db-pool.ts setup` (155–156). `.claude/settings.json` 5 still injects `AT_DB_SLOT=1`. W’s own section 2 lists these four pieces.
2. **W.** “The cloud brief template tells a fresh VM to run `bun tests/at/harness/db-pool.ts setup` (line 157).” That command is at `.claude/skills/controller/SKILL.md` 155–156. Line 157 is the `codex login` bullet.

**X (2)**

1. **X.** Same v2 sentence as W (“uses none of the ceremony except `mechanical`”). Same refs: `controller/SKILL.md` 46–47, 71–72, 155–156; `.claude/settings.json` 5.
2. **X.** Same “line 157” citation for `db-pool.ts setup`. Actual lines are 155–156.

**Y (4)**

1. **Y.** “Loop greens depend on `runner` / … . Nothing in that set imports `db-pool.ts`.” Also: “Loop greens touch no slot code at all.” `tests/at/harness/runner.ts` 44 is a load-time import of `occupy`, `prepare`, `evidence`, and `stackEnv` from `db-pool.ts`. That import runs for the loop tier too.
2. **Y.** “Slot path to park: … slot-shaped parts of `attestation.ts` + `live-email.ts`.” `live-email.ts` 94–114 takes `catcherUrl` and a branded attestation. It does not compute slot ports. The explorer notes and the other explanations keep this file.
3. **Y.** “The H4 judge (`oracles.ts`, `record-oracles.ts`, empty `recordings/`) already has zero suite callers, so it parks silently.” `index.ts` 24 imports `createOracleCapability`. Construction is at 205, 376, and 406. `createHarness` assigns `oracles: ledger.oracles.value` at 502. Removing `oracles.ts` breaks both suites.
4. **Y.** Against the 44321 stack, AT-001.12 / AT-001.13 “hang or false-red.” `_integration.ts` 71–83, 487, 559: AT-001.12 waits 135 s, AT-001.13 polls 150 s, both under `INTEGRATION_TIMEOUT_MS = 240_000`. They fail inside the budget. They do not hang past it.

**Z (4)**

1. **Z.** “seventeen PowerShell scripts in `loop/work/`.” That directory has 15 `.ps1` files. The other two files are `attribution-epoch.txt` and `pstack-models.expected.md`.
2. **Z.** “The harness, in return, refused to run integration unless the ceremony had reserved a slot for the branch.” `.claude/settings.json` 5 sets `AT_DB_SLOT=1`. `runner.ts` 1338–1339 passes that override into `occupy`. The override path in `db-pool.ts` 906–929 skips reservation admission.
3. **Z.** “`loop/work/` 17 files; only `work-lib`, `materialize`, `statusline`, `guard-branch-switch` have a live caller.” `.github/workflows/ci.yml` 85–103 still runs `loop/work/twin-check.ps1`.
4. **Z.** “Both ids become hangs and then false reds.” Same waits as above: `_integration.ts` 71–83, 487, 559. They false-red inside four minutes. They do not hang.

Line numbers that W, X, and Z cite for the runner, the pool, CI, manifests, JWT, and the twin-check callers matched this tree. Manifest counts 21/16, 16/21, 11/1, 0/12 match `tests/at/expected/req-001.json` and `req-016.json`. Slot 1 API 45321, personal block 44320–44329, `jwt_expiry = 3600` at `supabase/config.toml` 174, and `SLOT_JWT_EXPIRY_SECONDS = 120` at `db-pool.ts` 407 also match.

## Criterion 2 — omissions

Facts the question needs, taken from the four explorer notes, and checked against this tree.

**W.** None that the parking job needs.

**X (1)**

1. **X.** Does not say that `CLAUDE.md` section 5 still opens with `/work`, or that the three standing rules in `CLAUDE.md` 76–91 stay. Explorer e3 and the brief treat that as the old-prose park target.

**Y (8, score floor)**

1. Load-time `runner.ts` 44 import of `db-pool.ts` (Y states the opposite).
2. `writeAttestation` needs a `ProvenSlotRead` (`attestation.ts` 100–108). Today only `proveSlotTarget` (`db-pool.ts` 1194–1244) produces one, keyed on `ai4good-slot-N`.
3. A 44321 path still needs `acquireStackLock` on the one stack (`runner.ts` 397, 308). Today the lock is only taken on `slotClaimKey` (`db-pool.ts` 199–201).
4. `resetLocalDatabase()` with no target (`runner.ts` 984–994) already aims at the repo stack and is unused by the integration path.
5. Identity proofs to keep: `localStackProblems` (`runner.ts` 754–807) — loopback, configured ports, `iss=supabase-demo`, no hosted `ref`.
6. `CLAUDE.md` still leads with `/work`; the three standing rules stay (`CLAUDE.md` 70–91).
7. `loop/drills/run-drills.ps1` 306–370 binds the agent files, the phase files, and the twin check. Parking the agents without the drills turns the drills red. (Y mentions `run-drills.ps1` only as a twin-check caller.)
8. `statusline.ps1` 108 dot-sources `work-lib.ps1` with no guard. Parking `work-lib.ps1` as a ceremony script breaks the live status line.

**Z (3)**

1. **Z.** Same `CLAUDE.md` `/work` lead and standing-rules keep (`CLAUDE.md` 70–91).
2. **Z.** Does not say the no-target `resetLocalDatabase()` overload already aims at the one stack (`runner.ts` 984–994).
3. **Z.** Does not name root `AGENTS.md` 65–110 as a third, stale way-of-work document (explorer e3).

## Criterion 3 — unsupported claims

**W.** None.

**X.** None.

**Y (1)**

1. **Y.** The 44321 path “needs … a non-slot way to build `LiveVendors` (or drops the brand requirement).” `live-email.ts` 100–106 only checks `SLOT_ATTESTATION_BRAND`. `capabilities.ts` 86 defines that brand as the string `'slot'`. Explorer e1: the brand is a leftover; the nonce round trip stays.

**Z.** None beyond the criterion-1 errors.

## Criterion 4 and 5 (no item lists)

**Dependency map.** W, X, and Z each name what the question names (slot pool, v1 agents and scripts, twin-guard step, harness freeze, one stack), what touches it, and what it touches. W’s eight-point 44321 list is the most complete (`stackEnv` cannot emit 44320–44329; `writeAttestation` still needs a positive project proof; JWT 120 lives only in the parked generator). Z’s park-set mermaid is the clearest caller picture. Y’s mermaid is too thin to plan from: it misses the load-time import, the identity-read gap, the one-stack lock, and the no-target reset.

**Reader load.** X is the one a new engineer can read once. It follows the question: runner, slot path, child/ledger, declared state, CI, ceremony callers, 44321 inversions, freeze. W is complete and ordered, but long (twenty gotchas). Z is clear until the last section. Y is one dense block; a senior can parse it, but the parking plan is not separable from the errors.

## Out of scope

**Z only.** Section “How it actually resolved” (`explanation-Z.md` 447–474) describes later commits on `main` (`7d897b7`, `aa9a2a4`, `loop/parked/v1/`, `live-stack.ts`). Noted once. Not scored as an error, and not counted as coverage.

W, X, and Y stay on this commit.

## Ranking

1. **W.** Best parking plan: load-time import, `stackEnv` refusal, attestation proof gap, JWT pin, isolation, twin-check’s three callers, and the script/status-line couplings are all named.
2. **X.** Same accuracy as W and easier to read. It drops the `CLAUDE.md` `/work` park target.
3. **Z.** Strong map and a clear 44321 inversion, but four false claims (script count, reservation requirement, live callers, JWT hangs).
4. **Y.** Misses the facts needed to park without breaking loop CI, and states the load-time import backwards.

W=22 X=22 Y=10 Z=18
W > X > Z > Y
Y: it says loop-green files including `runner.ts` do not import `db-pool.ts`; parking the pool without rewriting `runner.ts` 44 would fail loop CI.
Yes: W is good enough to hand a new engineer unchanged.