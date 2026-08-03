1. Quote: “`AT-016.01` | `h.static` … `h.sentinels` … `h.vendors.email.attempts()` … | stays RED — blocked by H5.”

   Wrong: `h.static.providerClientImporters()` throws first while the static scan remains pending, so the test never reaches sentinels or vendors. Its first blocker is H3 static scan, not H5.

   Should say: “`AT-016.01` first reaches `h.static.providerClientImporters()`; sentinels and vendors are latent, unreachable dependencies. It remains red on H3 static scan; H5 becomes relevant only after that scan lands.”

2. Quote: “Replace the `pendingCapability` seams in `index.ts` with real implementations.”

   Wrong: Honest fault injection cannot be implemented in `index.ts` alone. The fixture has no fault-controller seam; it writes the event and deliveries before setting the transition, has no rollback boundary, and `drainDeliveries()` is an array loop rather than a restartable process with an identity.

   Should say: “Also modify the fixture-adapter interface and `req-016/_fixture.ts` to expose a shared fault hook, transactional rollback boundary, and restartable delivery worker whose real epoch changes across restart.”

3. Quote: “a fault induced between a state transition and its event write, where the assertion is that the rollback held.”

   Wrong: `AT-016.09` only rejects unequal outcomes. It passes when both the transition and event remain committed, so a fault fired after both writes can falsely prove “rollback.”

   Should say: “The no-fault control must assert transition=true and event=true; after the verified between-transition-and-event-write crash, assert transition=false and event=false for every guarded row.”

4. Quote: “The declared types in `contracts.ts` are the contract” and “Does the scan surface need anything the declared `Sentinels` type cannot express?”

   Wrong: The contract is declared settled while its adequacy remains open. No adapter exposes named scan scopes, `scan()` is never called, and `AT-016.01` cannot even reach `plant()` while static scan throws first. A no-op sentinel implementation can therefore satisfy the final gate.

   Should say: “Adapters provide named readable scopes; `scan()` rejects unknown or unreadable scopes, returns matching planted markers for presence, and returns `[]` only after successfully reading a known scope. Add red/green implementation tests for planting, reuse refusal, presence, absence, and unknown scopes.”

5. Quote: “`conformance.selftest.ts` already tests all four. This is binding on the implementation.”

   Wrong: Those tests invoke the four predicates directly; they do not prove that concrete `Sentinels` and `Faults` methods route through them. An implementation can bypass every predicate while those tests remain green.

   Should say: “The existing tests cover the predicates only. Add concrete-capability conformance tests proving short/reused sentinels are refused, unknown fault points are refused, clearing an unfired fault fails, and a restart with an unchanged epoch fails.”

6. Quote: “At loop tier there is no product source — the tier is database-free and drives a fixture stand-in.”

   Wrong: Loop tier controls runtime and database use; it does not remove the checkout’s source tree. A database-free scanner can inspect real source rooted at `REPO_ROOT`. Today that scan would meaningfully return no notification emitter, exposing product absence rather than a missing harness capability. The ruling also leaves the scan ownerless after declaring it belongs to this item.

   Should say: “`providerClientImporters()` scans real source rooted at `REPO_ROOT`, never fixture code, at loop tier. Because the notification product is absent, resolve how that honest assertion red is declared before implementing the scan.”

7. Quote: “`AI4DEV-19` has no children,” “`AI4DEV-3` has no parent,” and “Branch … cut from `origin/main` at `8e939a0`.”

   Wrong: The work skill explicitly forbids putting derivable chain, state, branch, or base facts into a brief; they can drift after the brief is written.

   Should say: “At pickup, verify the item is a leaf, derive its parent chain from Linear, take `gitBranchName` from Linear, and derive the base from Git; report any disagreement as a conflict.”