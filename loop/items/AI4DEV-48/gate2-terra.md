Severity scale: blocker = defeats the item’s central guarantee; major = leaves a promised guard/evidence path ineffective; minor = materially overstates enforcement.

[1] severity: blocker    tests/at/harness/capabilities.ts:193  
    claim: `oracles.judge` reaches `real` on negative evidence: any non-`loop` tier plus any transport other than `replay-fs` is accepted, including the explicitly `fake` transport.  
    why it matters: `NEVER_TOUCHED` is `kind: 'fake'` in `oracles.selftest.ts:195-201`, yet lines 960-961 require it to be `real` at integration/drill. Directly calling `witnessedCapability('oracles.judge', {}, { tier: 'integration', transport: 'fake' })` also reaches the real branch. The plain `string` evidence fields at `capabilities.ts:45-48` additionally permit arbitrary values. This is “not a known stand-in” promoted to real, not positive grounds.  
    unverified-runtime-claim: yes  
    verify: exercise those direct calls and an injected `kind: 'fake'` transport through `createOracleCapability`; neither may yield `provenance: 'real'` if the stated fail-closed rule is to hold.

[2] severity: major    tests/at/harness/capabilities.ts:241  
    claim: The adapter-derived route is neither loader-owned nor constrained to its two declared families: any caller may supply any non-empty name and module URL.  
    why it matters: `adapterDerivedCapability()` validates only non-emptiness before minting a stand-in at line 250. The new conformance test itself supplies an unimported `file:///probe/.../_fixture.ts` URL at `conformance.selftest.ts:144-148`; the ledger test checks only that a reason contains `_fixture.ts` at lines 232-235. Thus a fabricated or wrong URL passes, as does an unwitnessed name on this route. The canonical loader also accepts raw public `requirement` strings into `join()` (`index.ts:59-61`, `152-156`, `215-219`), so its claimed caller-proof path boundary does not exist outside the registry path.  
    unverified-runtime-claim: yes  
    verify: add negative controls for an arbitrary route name/URL and for a path-normalized or symlinked adapter, asserting rejection or that the recorded reason identifies the module actually executed.

[3] severity: major    tests/at/harness/conformance.selftest.ts:195  
    claim: The new tests do not prove the oracle witness independently refuses tier/transport mismatches.  
    why it matters: `createOracleCapability()` rejects loop/live before calling the witness (`oracles.ts:1133-1142`) and rejects above-loop/replay before calling it (`1147-1155`). The preserved oracle selftest therefore exercises only those earlier checks; the new conformance test exercises only missing evidence. Removing the witness’s mismatch branches at `capabilities.ts:175-191` would leave these assertions green, despite D6’s promise of independent refusal.  
    unverified-runtime-claim: yes  
    verify: directly assert that `witnessedCapability('oracles.judge', value, { tier: 'loop', transport: 'live' })` and the integration/replay equivalent throw; mutation of either witness branch must make its assertion fail.

[4] severity: minor    tests/at/suites/req-016/_fixture.ts:23  
    claim: The rewritten header incorrectly says making this adapter “look otherwise” requires editing a named witness.  
    why it matters: `sut.*` is deliberately outside `WITNESSES`; its provenance comes from the separate unconditional route at `capabilities.ts:241-250`. Altering that route changes every adapter-derived verdict without editing any named witness. The real improvement is that this is no longer a one-word call-site relabel, but the comment still overstates the mechanism.  
    unverified-runtime-claim: no