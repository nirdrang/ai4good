## 1. Typecheck

Command: `bun run typecheck`  
Exit code: `0`  
Decisive output: `typecheck OK: both configs clean`.

## 2. Harness selftest

Command: `bun run at:selftest`  
Underlying exit code: `1`.

This is `COULD-NOT-VERIFY-IN-SANDBOX`, not a code failure. Vitest reported:

`Cannot read directory "../../../../..": Access is denied.`

Substitute evidence: PR #35 CI run 49, `verify` job, checked out the same SHA. It reports `Test Files 8 passed (8)` and `Tests 167 passed (167)`.

## 3. Expected loop result

Command: `bun run at:verify req-016 --tier loop --expect`  
Underlying exit code: `4`.

This is `COULD-NOT-VERIFY-IN-SANDBOX`, due to the same ancestor-directory denial and `vitest produced no report`.

Substitute evidence from PR #35 CI run 49:

- `AT-016.01 red — CapabilityPending: CAPABILITY PENDING — H3 static provider scan`
- `AT-016.11 green`
- `12 P0: 11 green, 1 red, 0 missing`
- `EXPECTED: the run matches ... req-016.json exactly`

## 4. Acceptance bijection

Command: `bun run at:check req-016`  
Exit code: `0`.

Decisive output:

`12 P0 in the acceptance file, 12 registered in the suite`  
`RESULT: 12 P0 ids in bijection`

## 5. Falsification transcripts and residue

Read all four proof files:

- F1: unconditional `markSent` wiring makes AT-016.11 red because the provider is never asked.
- F2: replay duplicate acceptance makes AT-016.11 red on duplicate provider pairs; the harness selftest also fails.
- F3: wrong-recipient retry makes AT-016.11 red with an unexpected `actor-ngo:email` pair.
- F4: routing an in-app row through email makes AT-016.05 red with off-channel provider trace entries.

Current checks:

- `git status --short`: `(clean)`.
- F2/F3/F4 mutation signatures: no matches.
- F1 live path contains the intended separation: in-app shortcut at `_fixture.ts:363`, provider call at `:368`, and conditional acceptance marking at `:373`.

## 6. HEAD, branch, and remote evidence

- Branch: `nirdrang/ai4dev-21-h5-vendor-stand-ins-anthropic-usage-stripe-github-lovable`
- HEAD: `5374a803841d8b00dc92b4f30e02f7adda31ee09`
- Local origin tracking ref: same SHA.
- PR #35 head SHA: same SHA.
- CI run 49’s `verify` job checked out and reported the same SHA.

A direct `git ls-remote` attempt returned exit `128` because this sandbox could not connect to GitHub; the PR metadata and CI checkout supplied the remote evidence.

## Anything the merge ruling should know

The requested oracle spot-checks are present:

- AT-016.11 uses exact provider-pair equality through `pairProblems(expectedPairs(...), countPairs(acceptedForEvent)).toEqual([])` in [c-reliability-guard.test.ts:282](<C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-af1e90584864a51d0/tests/at/suites/req-016/c-reliability-guard.test.ts:282>).
- AT-016.05 checks both off-channel attempts and exact accepted-pair reconciliation in [d-taxonomy-evidence.test.ts:259](<C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-af1e90584864a51d0/tests/at/suites/req-016/d-taxonomy-evidence.test.ts:259>).
- A direct runtime check produced `actual=["H3 static provider scan"]`, `declared=["H3 static provider scan"]`, `exactOrdered=true`.

Nothing else was found in the working tree.