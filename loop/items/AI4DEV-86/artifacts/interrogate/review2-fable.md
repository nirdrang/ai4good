# Interrogate review 2 — fable lane (the fix commit)

Scope: the fix commit only, read from `artifacts/interrogate/diff-fix.patch` (1,871 lines against
`ea73436`) and from the live files it names; I did not re-derive the patch from git. I did not run
`bun run typecheck` or `bun run at:selftest` (read-only assignment); CI runs both on every push
(`.github/workflows/ci.yml:134`, `:139`), so the new selftests are on the gate.

## Done as ruled — checked, not flagged

1. Lock: `stale-or-dead`, `TakeoverPolicy`, `StackLockOptions`, `LOCK_STALE_MINUTES` and the
   `AT_LOCK_STALE_MINUTES` knob are gone from the live tree (grep outside `loop/`: no hit).
   `holderIsLive` is pid-only (`runner.ts:344-346`); the `identified` guard is unconditional; the
   takeover line always says "no longer running". The three lock selftests and the race pass no
   option (`runner.selftest.ts:389-516`).
2. `AT_REPO_ROOT`: the integration branch refuses on `REPO_ROOT !== INSTALL_ROOT` before the
   config read and the lock (`runner.ts:1573-1578`); `check.ts:34-37` says so; the selftest spawns
   the real runner against a complete disposable tree and proves exit 3, the message, no
   `config.toml` mention and no lock directory (`runner.selftest.ts:348-378`).
3. One proof type: `PROVEN` is a module-private unique symbol (`runner.ts:1071`), the interface
   requires it (`:1080`), only `identityVerdict` sets it (`:1148`); `attestation.ts:43` imports the
   type only and `writeAttestation` takes it (`:95`); `ProvenSlotRead` and both null branches are
   gone, and the two selftests that drove them are replaced by one that drives the real refusal
   (`runner.selftest.ts:280-284`). Second read immediately before the reset (`runner.ts:1220-1221`);
   Docker stays out, with the reason (`:1210-1213`).
4. Pin: `readLocalConfig` reads `[auth] jwt_expiry` (`runner.ts:274`, required at `:285`; the key
   sits under `[auth]` at `config.toml:164-180`, before the first `[auth.*]` subsection at `:229`);
   `lifetimePinProblem` names both numbers and both commands (`:1172-1181`); `prepareLocalStack`
   refuses first (`:1216-1217`); the selftest pins the real tree's config to the registry
   (`runner.selftest.ts:287-305`). `_live.ts` checks `exp - iat` of the first token (`:264-277`).
5. Messages: no JSON is "no stack is running for <id>; run `bun run db:start`" with no refusal
   phrase (`runner.ts:1117-1122`, tested at `runner.selftest.ts:239-245`); the no-own-name refusal
   names the benign cause (`:1139-1146`); the lock has its own try (`:1585-1594`).
6. `CapabilityEvidence` and the witness parameter are gone; every remaining
   `witnessedCapability` call passes two arguments (grep over `tests/at`).
7. Prose: every listed site is corrected — `_fixture.ts` 110, 117, 473, 576; the suite header;
   `_integration.ts` 441; `contracts.ts` 70; `config.toml` 18 and the pin comment (local only,
   never pushed — and nothing in the tree runs `supabase config push`, grep); `live-email.ts` 14;
   `.env.example`; the attestation header; the runner docstrings D17 listed; `mechanical.md`;
   the two README claims.
8. `containerNames` is one scan with an alphanumeric-anchored tail (`runner.ts:1056-1062`), with
   the period case tested (`runner.selftest.ts:212-220`); `childCoordinates`, `evidenceLine`,
   `treeState` have selftests (`:307-346`); the loop test reads `AT_CONFIG` for itself and
   `ACCESS_TOKEN_LIFETIME_MS` is no longer exported (`b-verification-and-sessions.test.ts:67`,
   `:97`; `_integration.ts:68`, still used at `:490`, `:562`).
9. The five scripts and the `find-batch` skill are renamed under `loop/parked/v1/`, the README
   lists them with the rule, and nothing live names `find-batch` (grep).
10. Seam docstring scoped to `tests/` (`runner.ts:601-603`); verify skill names the lifetime;
    eslint and prettier ignore `loop/parked`; CLAUDE.md points at the parked header.
11–15. Cloud setup script and readme, `.env.example` (and the selftest it cites does plant
    `AT_JUDGE_API_KEY`, `runner.selftest.ts:60`), `.prettierignore`, the README's byte-identical
    claim, the dated brief correction, the suffix residual in the docstring and the README.

`atconfig.ts` has no imports, so the runner's new runtime import of it adds no cycle. The
type-only import in `attestation.ts` is erased by bun, so the header's "no runtime edge" holds.

## Findings

### 1. [warning] The stale-stack check lands after the reset and is graded as red acceptance ids, which the runner's own contract says an infrastructure failure never is
**Location**: `tests/at/suites/req-001/_live.ts:264-277` (`checkLifetime`), `:415`, `:506`, `:963`;
`tests/at/harness/runner.ts:1215-1227` (`prepareLocalStack`), `:1598` (the evidence line),
`:35-37` (the header's contract), `:1379-1384` and `:1417-1442` (how a throw becomes a row and an
exit code).
**Finding**: Done as ruled (item 4), and this is the consequence. A stack started under an older
`config.toml` passes both identity reads (the CLI derives its ports from the same file, and
`status` says nothing about `jwt_expiry`), passes the pin check (config against registry, both in
the tree), is reset, receives the nonce, and the transcript prints `reset OK`. The first body that
signs in then throws inside `signInWithEmailPassword`. `lifetimeChecked` is set only on a pass, so
every later sign-in throws the same sentence. The run ends as N red ids and exit 1; with `--expect`
it is N deviations. The header promises "Any failure in that sequence is an INFRASTRUCTURE failure:
non-zero exit, no tests run". This failure ran the tests, reset the founder's database, and exits
with the test-failure code.
**Evidence**: The runner holds no access token at `prepareLocalStack`, so the check cannot live
there as written; the docstring at `_live.ts:257-262` says exactly that. The report is not
misleading — `analyzeReportedTests` puts the first line of the failure message in the detail
column, and that line names the cause and the two commands — so the cost is shape, not
diagnosis: a wasted reset, exit 1 instead of 3, and an evidence line that asserts a well-founded
run two lines above the report that says the stack was stale.
**Suggestion**: The runner does have what it needs after the first `waitForReady`: the proven
`apiUrl` and `serviceRoleKey`. One `POST /auth/v1/admin/users` with `email_confirm: true` and one
password grant — the two calls `_live.ts:945-960` already makes for the platform administrator —
yield a token before the reset; `exp - iat` against `config.jwtExpirySeconds` becomes an `infra`
refusal (exit 3, "No tests were run"), and the reset that follows erases the throwaway user, so
nothing is left behind. Keep the `_live.ts` check as the second line or drop it. If the lead keeps
the current placement, the header sentence should stop claiming what this path does not do.

### 2. [nit] The proof docstrings claim more than the code does, in two sentences
**Location**: `tests/at/harness/runner.ts:1064-1071` (the brand), `:965-968`
(`resetLocalDatabase`), `:1200-1204` (WHY TWO READS); `tests/at/harness/attestation.ts:89-90`;
`tests/at/harness/runner.selftest.ts:154-156` (`provenDemo`), `:270-273`.
**Finding**: (a) "an importer cannot write one by hand" / "cannot be written by hand". The brand
stops an object literal, which is the forgery the first panel found. `provenDemo()` writes a proof
by hand in three lines: a `CliResult` whose stderr says `Stopped services:
[supabase_imgproxy_demo …]` and whose stdout is any local-looking JSON, judged by the exported
`identityVerdict`, is a branded proof for any project id with no CLI run. `identityVerdict` must
stay exported (seven verdict selftests need it), so the true guarantee is: a proof exists only if
`identityVerdict` accepted some result, and on the live path only `proveTarget` feeds it one.
(b) "That narrows the check-to-use window to the width of one CLI call" holds for the reset. The
attestation write at `:1225` — the second act the same docstring says receives the second read —
runs after `waitForReady` (budget 120 s) and the migration proof, on that same read.
**Evidence**: For (a), the threat model paragraph already concedes the cast; it does not concede
the fabricated input, and the selftest demonstrates it. The honest mistake that reaches this door
— judging a result obtained for target A against target B — is caught by the verdict's own
foreign-name step, so the residual is deliberate fabrication only. For (b), the write can only
reach `read.status.dbUrl`, the database the reset just rebuilt, so the exposure is the unlocked
`db:stop`/`db:start` window already filed (sol 4). Both are precision defects in the two places a
reader of the destructive path is told to trust.
**Suggestion**: "cannot be written as a literal; minted only by `identityVerdict`, which on the
live path only `proveTarget` feeds" — and "narrows the reset's check-to-use window to one CLI call;
the attestation write runs on the same read after the readiness wait".

### 3. [nit] The pin check runs after the lock and inside the try whose catch appends Docker advice — the shape ruling 5 removed for the lock
**Location**: `tests/at/harness/runner.ts:1216-1217`, `:1585-1607`, `:1533-1538`.
**Finding**: `lifetimePinProblem(config)` is pure over the config `main` reads at `:1586`. It runs
inside `prepareLocalStack`, so a mismatch first takes the machine-wide lock, then refuses, and the
refusal is followed by the rebuild paragraph and `stackHelp` ("Docker Desktop is not installed…").
The pin message already names both numbers and both commands; what follows it is noise, and the
lock was taken for two literals in the tree.
**Suggestion**: Check the pin in the first try, beside `readLocalConfig`, before
`acquireStackLock`. Two lines move; `prepareLocalStack`'s docstring loses one clause. Ruling 4 says
`prepareLocalStack` refuses; the refusal is the same function called one frame earlier, so the lead
can say whether that counts.

### 4. [nit] `parseStackStatus` keeps two branches its only caller pre-empts, and a launch failure still wears the refusal phrase
**Location**: `tests/at/harness/runner.ts:681-694` (`parseStackStatus`), `:1112`, `:1117-1122`,
`:1126` (`identityVerdict`), `:669-673` (`statusJsonSpan`).
**Finding**: `identityVerdict` is now the only caller of `parseStackStatus` (grep over `tests/at`),
and it handles `res.error` at `:1112` and no-JSON at `:1117` before calling it, so the branches at
`:682-685` and `:687-694` are unreachable and `statusJsonSpan` runs twice per verdict. Separately,
`:1112` reports a spawn failure as `REFUSING TO RESET <id>`; by the argument ruling 5 accepted for
no-JSON, a CLI that could not be launched is not an identity mismatch either. The path is rare
(`bunExecutable` and `supabaseArgs` throw first for the common causes), hence a nit.
**Suggestion**: One place for the two pre-checks, in whichever function keeps them; make
`parseStackStatus` module-private; word the launch failure like the not-running one.

### 5. [nit] `_live.ts`: a third copy of the payload decode, and a refusal that names a file it did not read
**Location**: `tests/at/suites/req-001/_live.ts:178-195` (`sessionIdOf`, `accountIdOf`,
`lifetimeOf`), `:270-274`.
**Finding**: `lifetimeOf` is the third function in the file that does
`JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url')…)`; one `claimsOf(token)` serves
all three. The refusal says "supabase/config.toml pins jwt_expiry = ${pinned}", where `pinned` is
the registry's number; the adapter never read the config. Under `at:verify` the runner has just
refused unless the two agree, so the sentence is true by transitivity — but a message should name
what it compared.
**Suggestion**: "the registry pins accessTokenLifetimeSeconds = 120, and the runner has checked
that supabase/config.toml agrees" — plus the one helper.
