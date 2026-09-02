## Re-clearance of the unit-5 fix

**Verdict:** the eight ruled items are in the tree. The destructive path is tighter, not looser. No findings.

### (1) Eight items — all done as ruled

| # | Ruling | Evidence |
|---|---|---|
| 1 | Target travels in the read; one-arg reset and write; mismatch branches and their tests gone | `StackIdentityRead.target` at `runner.ts:1096`. `resetLocalDatabase(read)` at `:977` aims at `read.target` (`:987`). `writeAttestation(read, nonce)` at `attestation.ts:88`. `prepareLocalStack` passes that one read to both acts (`runner.ts:1294`, `:1298`). Project-id mismatch throws and `AttestationTarget` are gone. Selftests now drive the spread, not a second parameter (`runner.selftest.ts:280-295`). |
| 2 | Private mint, non-enumerable non-writable brand, freeze the read and its status | `mintProvenRead` (`runner.ts:1106-1114`) uses `Object.defineProperty(..., { enumerable: false, writable: false })` then `Object.freeze` on the read, `target`, `status`, and `containers`. Reset reads the brand at use (`:981-986`). Selftest: spread drops the symbol; freeze throws on re-aim (`runner.selftest.ts:286-307`). |
| 3 | Lifetime pin before the lock, beside the data-root guard, bare `infra` | After `REPO_ROOT !== INSTALL_ROOT` (`runner.ts:1646-1650`), `main` calls `lifetimePinProblem` and `return infra(pin)` (`:1663-1664`) before `acquireStackLock` (`:1669`). `prepareLocalStack` no longer checks the pin (`:1282-1284`). Spawn test: exit 3, both numbers, no `Docker`, no lock directory (`runner.selftest.ts:433-467`). |
| 4 | Re-read `config.toml` from the target workdir; refuse id / port / `jwt_expiry` drift | `configDriftProblems` holds `project_id`, `[api] port`, `[db] port`, `[local_smtp] port`, `[auth] jwt_expiry` (`runner.ts:1229-1239`). Called after the first wait, before the second proof (`:1285-1293`). Unit test names field and both values (`runner.selftest.ts:310-320`). |
| 5 | Live lifetime is exact: `issued === pinned` | `_live.ts:208`. Tolerance of 5 s is gone. Selftest accepts the pin and refuses pin±1, pin+5, 3600, and a token with no `exp`/`iat` (`runner.selftest.ts:343-357`). |
| 6 | Cloud setup lines 45 and 57–58 | `.claude/cloud-environment-setup.sh:45-46` and `:57-59`: the session starts the stack with `bun run db:start`; the harness starts nothing; the variables box carries nothing. |
| 7 | Prose nits | Brand and reset docstrings name the live-path mint (`runner.ts:1073-1082`, `:967-974`). Two-read paragraph names the reset window vs the write window (`:1260-1267`). Loop-import comment is qualified (`_integration.ts:63-64`). `_live.ts:10-13` says “the stack”. Parked README records the stale hook header (`loop/parked/v1/README.md:53`). Launch failure has no `REFUSING` (`runner.ts:1141-1145`; `runner.selftest.ts:255-259`). |
| 8 | Slot wording in the two headers | `_live.ts:10-13` and `live-email.ts:6` say “the stack”. Wire names (`AT_SLOT_ATTESTATION`, adapter `slot`) are unchanged, as already dismissed. |

### (2) Destructive-path regression?

No. Reset no longer takes a separate `CliTarget`; a spread that re-aims `target` is refused before spawn (`runner.ts:981-987`). Write still opens `read.status.dbUrl` only (`attestation.ts:90`), and that status is frozen. `prepareLocalStack` still proves, then resets on that second proof, then writes. Pin and config-drift refusals sit *before* those acts. The old project-id mismatch throw is gone by ruling 1; it never chose the URL. A spread that replaces `status.dbUrl` can still reach `writeAttestation` (type-only brand, cycle still forbidden); that write already trusted `read.status.dbUrl` on the previous head, including via mutation, which freeze now blocks.

### (3) Diff outside the eight items?

No. Nine files. Every hunk is a ruled signature, mint/freeze, preflight, drift check, exact lifetime, cloud/README/header prose, or the selftest that drives one of those.

**Findings:** none.