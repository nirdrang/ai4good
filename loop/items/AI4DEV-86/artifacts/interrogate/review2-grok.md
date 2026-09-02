The fifteen ruled items are in the tree. The lock, the data-root refusal, the branded proof, the lifetime pin, the not-running message, and the parked leftovers match the rulings. Two execution gaps remain on the new destructive path.

## Findings

### 1. [warning] The new lifetime-pin refusal is born already wrapped in Docker advice
**Location**: `tests/at/harness/runner.ts:1172-1180` (`lifetimePinProblem`), `:1215-1217` (called first in `prepareLocalStack`), `:1596-1606` (the prepare `catch` that appends `stackHelp`)

**Finding**: Item 4 puts the jwt pin in `prepareLocalStack`. Item 5 only pulled lock acquisition into its own `try`. A pin mismatch therefore takes the stack lock, then fails inside the prepare `catch`, which always appends `stackHelp` (“Docker Desktop is not installed… run `bun run db:stop` then `bun run db:start`”).

**Evidence**: `lifetimePinProblem` already names both numbers and the two restart commands. The catch then appends a second diagnosis that is about a missing daemon. That is the same defect item 5 fixed for lock contention, now on a path this commit introduced. A config-vs-registry mismatch is not a Docker failure. Identity `REFUSING TO RESET` errors take the same catch; those were pre-existing. The pin path is new.

**Suggestion**: Call `lifetimePinProblem(config)` in the first `try`, next to `readLocalConfig`, before `acquireStackLock`. Report it like a config error: no lock, no Docker paragraph. Keep the function itself; move the call.

### 2. [warning] The branded proof does not seal the URL `writeAttestation` uses
**Location**: `tests/at/harness/runner.ts:1071-1087` (`PROVEN`, `StackIdentityRead`), `:1148` (`identityVerdict` return); `tests/at/harness/attestation.ts:88-104` (`writeAttestation`)

**Finding**: Item 3 is done at the type gate: an object literal is no longer a `StackIdentityRead`, `ProvenSlotRead` is gone, and both destructive acts take the branded type. The comment on `writeAttestation` then claims more than the type delivers: the database URL “comes out of that proof”, so a caller cannot hand a proof of one database and the coordinates of another.

That is true of a hand-written literal. It is false of a minted proof. `provenProjectId` and `status` are writable. `identityVerdict` does not freeze the object. `writeAttestation` is a type-only import of the brand, so at runtime it only compares `provenProjectId` and then opens `read.status.dbUrl`. After a real verdict, this still compiles and writes:

```ts
const read = identityVerdict(...)
read.status.dbUrl = 'postgresql://127.0.0.1:1/postgres'
await writeAttestation(target, read, nonce)
```

The reset path does not read `status` at all; it only string-compares `provenProjectId`. Reassigning that field on a minted proof authorizes a different `CliTarget`.

This is safer than `ProvenSlotRead` (you can no longer mint from air). It is not a sealed proof. `stampAttestation` already freezes its payload; this brand does not.

The second `proveTarget` before reset is real and does narrow the check-to-use window for the reset. `writeAttestation` still consumes that same pre-reset object after `resetLocalDatabase` (up to `RESET_TIMEOUT_MS`). For the write, the brand is a minting token, not a seal on the URL.

**Suggestion**: Make the payload `readonly`, and `Object.freeze` the returned read and its `status` inside `identityVerdict`, the same way `stampAttestation` freezes. Optionally export a runtime `isStackIdentityRead` that `writeAttestation` can call without exporting `PROVEN`.

### 3. [nit] “Slot” left in headers this commit rewrote
**Location**: `tests/at/suites/req-001/_live.ts:10-13`; `tests/at/harness/live-email.ts:6`

**Finding**: Item 7 listed `live-email.ts` line 14 and the `_live.ts` lifetime check. Those sites were updated. In the same headers this commit edited, the surrounding sentences still say “the slot’s own stack / gateway / catcher” (`_live.ts:10-13`) and “the slot’s stack” (`live-email.ts:6`), while the next bullet in `_live.ts` now says “the stack’s own edge-runtime”.

**Evidence**: The listed lines are fixed. The mixed wording is in the hunks’ own comment blocks, so a reader of the new “stack” sentence still hits “slot” on the line above.

**Suggestion**: Use “stack” in those two headers. Leave the wire names (`AT_SLOT_ATTESTATION`, `slot` on the live adapter) as already dismissed.