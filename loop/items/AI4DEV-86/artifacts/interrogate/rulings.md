# Interrogate rulings on head ea73436 (lead, 2026-09-02)

Reviewers: A fable@max (8 warnings, 1 nit), C grok@xhigh (4 warnings, 1 nit), D opus@xhigh (2 critical, 12 warnings, 4 nits). B sol@max pending at the time of ruling; folded in below when it arrived.

## Act on (one fix unit, then re-panel)
1. Delete the `stale-or-dead` takeover policy and its knob; dead-pid-only becomes the only behaviour (A1, C1, D5: consensus).
2. The integration tier refuses when `AT_REPO_ROOT` redirects the data root (`REPO_ROOT !== INSTALL_ROOT`); the destructive target is the real checkout only; `check.ts`'s "moves DATA only" sentence is corrected (D2).
3. One unforgeable proof type: `StackIdentityRead` carries a private brand only `identityVerdict` sets; `resetLocalDatabase` and `writeAttestation` both take it (type-only import into attestation.ts, no cycle); `ProvenSlotRead` and the two unreachable refusal branches go (D1 second half, A2, D13). `prepareLocalStack` proves again immediately before the reset and hands that second read to both destructive acts (D1, the check-to-use window). Docker stays out; the file says so and why.
4. The lifetime pin: `readLocalConfig` reads `[auth] jwt_expiry`; `prepareLocalStack` refuses when it differs from `AT_CONFIG.accessTokenLifetimeSeconds.value`, naming both numbers; one selftest pins the comparison (D4, C2). `_live.ts` compares `exp - iat` of the first access token with the pin and refuses with the true cause when the running stack is stale (A4, D3).
5. Messages: a stack that answers no JSON is reported as "no stack is running for <id>; run bun run db:start", not as a refusal; the no-own-name refusal names the known benign cause (both stopped services enabled in config.toml) (D6, A3). The lock acquisition gets its own try so a contention message carries no Docker advice (D14).
6. `CapabilityEvidence` and the evidence parameter of every witness are deleted (D9, A9, C4).
7. Stale prose is corrected at every site the reviewers listed: _fixture.ts 110, 117, 473; b-verification-and-sessions.test.ts header 9-19; _integration.ts 441-442; contracts.ts 70; supabase/config.toml 18; live-email.ts 14; .env.example 28; attestation.ts header; runner.ts docstrings that name the pool as their reason (D17); mechanical.md line 3; the parked README's two claims; the config.toml comment says the pin is local only, never pushed (A4) (A7, D10, D11, C3, C5).
8. The container-name scan is one pass with an alphanumeric-anchored tail (D15). Three selftests for `childCoordinates`, `evidenceLine`, `treeState` (D16). The loop test reads `AT_CONFIG` directly instead of importing from the integration module (A5, the coupling direction only).
9. Park by the item's own rule (A8): `ci-status.ps1`, `context-gauge.ps1`, `render-mermaid.ps1`, `sheet-check.ps1` with `pstack-models.expected.md`, and the `find-batch` skill (it tells the founder to type `/work`). `statusline.ps1` is not edited (it runs on every keystroke from the main checkout; its snapshot block is filed).
10. The seam docstring says what it covers: nothing under `tests/` assembles a CLI call elsewhere (D7, the sentence only). The verify skill says access tokens live `jwt_expiry` seconds, currently 120 (D18). `eslint.config.js` ignores `loop/parked/` (A7). CLAUDE.md section 5 says where the parked reply header's full text lives (D8, the pointer only).

## Consider (filed under Not done here)
- Extract the stack lifecycle out of runner.ts into its own module (A6, D12). Working code, 900 lines moved, at the end of an item that already moved 2,900; the arena's cycle argument still stands for the seam.
- `bun run db:reset` and the verify drive through the harness wall (D7). Already filed.
- Docker as a second instrument (D1). Rejected in the arena with reasons; a later item can revisit if the CLI's output shape changes.

## Noted
- Local sessions have no session-start banner now that banner.ps1 is parked and the tracked hook is remote-only (D11). Recorded in the parked README.
- `.claude/skills/work/` holds only the model-selection record (D11). The sheet cites that path; it stays.
- Two old item scripts under loop/items/AI4DEV-62 import the parked pool (C3). Frozen history in an old item folder; recorded in the README.

## Dismissed
- The two CLAUDE.md prompt-audit hunks loosen the process without a ruling (D8). The founder applied them by instruction on 2026-09-02 ("apply this to CLAUDE.md and run the audit again"); that is the ruling. The lost pointer to the parked header is real and is item 10 above.
- The registry read around `h.config` (A5 main point). Deliberate: at the integration tier the number is a fact about a running stack, not a knob a world may re-tune; the fix unit takes only the coupling-direction half.
## Sol (arrived after the fix unit launched; 4 critical, 8 warnings)
- Act on, added to the fix unit as items 11-15: cloud docs still presenting the pool, the stamp hook and the judge credential as current (sol 10); .env.example judge block (sol 10); .prettierignore for loop/parked (sol 12); the README's byte-identical claim corrected for SKILL.md (sol 12); a dated correction line in this item's brief where it says AT_DB_SLOT=1 (sol 9); the suffix-match residual recorded in the docstring and the README (sol 1).
- Already Act on: forgeable proof (sol 5 = D1/A2), lifetime drift (sol 6 = D4), the lock default (sol 11 = consensus), find-batch (sol 8 = A8).
- Noted, residual recorded (sol 1, "critical"): `endsWith('_<id>')` would count a container of a project whose id ends with `_poancmeitlmxejofwzuu` as this project's. No such project exists on this machine; an exact-name check needs a service list that the CLI changes (`edge_runtime` carries an underscore), and the docker label read is the instrument the arena rejected. Recorded, not fixed here.
- Noted, pre-existing, filed under Not done here (sol 2, 3, 4, all "critical"): the takeover gate can be cleared from under a suspended live holder and an empty gate file blocks forever; a reset child can outlive the lock on a signal and SIGKILL does not reach the process tree; db:start/stop/reset take no lock. None of the three is introduced by this diff; the lock protocol and the reset child handling are unchanged from main. They matter more now that the stack is the founder's own, which is why they are filed with that sentence.
- Dismissed (sol 7): the slot-shaped NAMES on the live path. Ruled at the ground station: names, not machinery; the round trip is the spine of every integration green.
- loop/out/way-of-work.md (sol 10): frozen v1 history under loop/out/; not edited.

# Second panel rulings on head db2153b (lead, 2026-09-02)
Reviewers: fable (1 warning, 4 nits), opus (6 warnings, 4 nits), sol (2 critical, 2 warnings), grok pending. All three confirm the fifteen items landed and that the destructive path is safer.

## Act on (unit 5, one small commit, cleared by one cross-family re-read and a re-run of the integration tier)
1. The target travels in the read: `StackIdentityRead.target`; `resetLocalDatabase(read)` and `writeAttestation(read, nonce)` take one argument; the mismatch branches and their selftests go (opus2 1).
2. The brand is minted by a private helper with `Object.defineProperty` non-enumerable, non-writable, and the read and its status are frozen (opus2 2, sol2 1 second half).
3. The lifetime-pin check runs before the lock, beside the AT_REPO_ROOT guard, reported bare through infra (opus2 3, fable2 3).
4. The second identity read re-reads config.toml from the target's workdir and refuses if project id, any port, or jwt_expiry differs from the locked snapshot (sol2 2).
5. The live lifetime check is exact: `issued === pinned` (sol2 3).
6. Cloud setup script line about 45 and 57-58 made consistent with "the session starts the stack with bun run db:start; the variables box carries nothing" (sol2 4).
7. The cheap prose nits: the two proof docstring sentences that claim more than the code (fable2 2); the comment claiming the loop tier does not import the integration module (opus2 8); `_live.ts`'s opening list (opus2 9); the README line the parked file contradicts (opus2 10); the launch-failure message no longer wears the refusal phrase (fable2 4).

## Noted / filed
- The stale-stack lifetime check lands after the reset as red ids, not as an exit-3 refusal; the runner cannot obtain a token before the reset without a sign-up (fable2 1). Filed.
- "No stack is running" is decided by the absence of a JSON span; a stack mid-start falls to the refusal shape with a message that names both causes (opus2 4). Noted.
- AT_LOCK_DIR parity (opus2 5) and the two-read claim on the write (opus2 6): the second read is handed to both acts; the docstring is tightened in item 7. Noted.
- `parseStackStatus` keeps two branches its only caller pre-empts (fable2 4 first half): frozen core, left.

## Dismissed
- `identityVerdict` is exported, so a caller can mint a proof from synthetic input (sol2 1 first half). By design: the pure verdict is what the selftests drive; the threat model the file states is an honest mistake, not an author set on defeating the design. Item 2 closes the spread route, which is the honest mistake.

- Grok (second panel, arrived after unit 5 launched): its two warnings are unit 5 items 2 and 3; its nit (slot wording in two headers) was added to unit 5 as item 8.
