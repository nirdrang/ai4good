## Findings

### 1. [critical] The branded proof remains forgeable and mutable

**Location**: [runner.ts:1071](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/tests/at/harness/runner.ts:1071), [runner.selftest.ts:142](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/tests/at/harness/runner.selftest.ts:142), [attestation.ts:95](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/tests/at/harness/attestation.ts:95)

**Finding**: The private symbol does not prove that a real identity read occurred, nor does it protect the proof’s contents after issuance.

**Evidence**: `identityVerdict` is exported and accepts caller-supplied `CliResult`, target, and config. The selftest itself constructs synthetic JSON, unsigned JWT-shaped strings, and container-name text, then obtains a branded proof through `provenDemo()`. Any importer can do the same and pass that proof to `resetLocalDatabase`.

Additionally, only the symbol property is readonly. `provenProjectId`, `status.dbUrl`, and `containers` remain mutable. A valid proof can therefore be changed directly or copied with object spread into a proof for another project or database. `resetLocalDatabase` then checks only the modified project ID, while `writeAttestation` trusts the modified database URL. This can authorize a reset without a real read or direct the attestation deletion at another database.

**Suggestion**: Export an unbranded pure classifier for tests, but let a private issuer perform the CLI read and create the proof. Make the payload deeply immutable and non-enumerable, or keep both destructive operations private behind `prepareLocalStack`.

### 2. [critical] The second identity check validates a stale configuration snapshot

**Location**: [runner.ts:1156](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/tests/at/harness/runner.ts:1156), [runner.ts:1215](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/tests/at/harness/runner.ts:1215), [runner.ts:1583](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/tests/at/harness/runner.ts:1583)

**Finding**: The new second read does not re-read the configuration it claims to certify.

**Evidence**: `main` reads `supabase/config.toml` once before locking. `prepareLocalStack` then reuses that object for both proofs, despite potentially waiting two minutes for readiness. The commit changed `proveTarget` from reading `target.workdir` itself to accepting this cached object.

If `project_id` changes during the wait while ports remain unchanged, the second invocation still forces the old ID through `SUPABASE_PROJECT_ID`, validates against the old snapshot, and resets the old project even though the checkout now declares another. The lock also remains keyed to the old identity, allowing another run using the new identity to acquire a different lock. A `jwt_expiry` change likewise bypasses the lifetime comparison because that check already ran.

**Suggestion**: Immediately before the second proof, re-read the configuration and compare every safety-relevant field with the locked snapshot. Refuse on any difference.

### 3. [warning] The live lifetime check accepts values that differ from the pin

**Location**: [_live.ts:191](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/tests/at/suites/req-001/_live.ts:191), [_live.ts:265](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/tests/at/suites/req-001/_live.ts:265)

**Finding**: A five-second tolerance contradicts the ruled exact lifetime pin.

**Evidence**: With a pin of 120, `Math.abs(issued - pinned) > 5` accepts every lifetime from 115 through 125 seconds. `exp` and `iat` come from the same token, so their subtraction is not affected by the client’s clock. A stale stack configured for one of those values passes without the promised true-cause refusal. The added selftests cover only config-versus-registry equality, not this live comparison.

**Suggestion**: Require `issued === pinned`. If a measured vendor behavior truly requires tolerance, encode and test that explicit behavior instead of describing unequal lifetimes as equal.

### 4. [warning] The corrected cloud setup instructions still contradict themselves

**Location**: [cloud-environment-setup.sh:43](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/.claude/cloud-environment-setup.sh:43), [cloud-session-readme.md:14](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-86/.claude/cloud-session-readme.md:14)

**Finding**: The cloud-document cleanup leaves mutually exclusive database instructions.

**Evidence**: The newly changed text says the operator starts the database with `bun run db:start`, while line 45 still says the hook or harness starts required containers. Neither does: the hook starts Docker, and the harness refuses when the stack is absent. Lines 57–58 also say database values come from the variables box, while line 24 and the cloud README say that box carries nothing.

**Suggestion**: State consistently that the session starts the config-defined stack manually and that no database variables are provisioned.