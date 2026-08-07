• I'll work through the review instructions. First, let me gather the contract, plan, rulings, and the diff.

• Now the diff and the harness sources.

• Now let me check the remaining diffs, greps for the removed API, and a few type details.

• Nearly there — final verification batch before I write the review.

• The review is complete — all files read, all eleven attack questions traced. Here is the deliverable.

  ---

  # Gate 2 review — AI4DEV-48 at `a871d59`

  **Severity scale:** BLOCKER = defeats the item's purpose · MAJOR = wrong behaviour or a false claim a consumer depends on · MINOR = drift risk, untested guard, or comment overreach · NOTE = observation, no action owed.

  **Scope check first:** the diff touches `capabilities.ts`, `index.ts`, `oracles.ts` (the two call sites plus the docblock), `conformance.selftest.ts`, `contracts.ts` (comments only), `_fixture.ts` (header only), and `loop/items/AI4DEV-48/`. `registry.ts`, `runner.ts`, `oracles.selftest.ts` and `tests/at/expected/req-016.json` are untouched — the may-not-touch list holds. A repository grep for `realCapability|standInCapability` outside `loop/items/` returns exactly zero hits (checked `*.ts`/`*.tsx`/`*.md`), so S5's exact-zero criterion is met as far as static reading can confirm.

  ## Findings

  ```
  [1] severity: MINOR    tests/at/harness/contracts.ts:327-330
      claim: The new comment generalises the self-defeating-lie property to every name on the
             stand-in list, but it holds only for the two seam-witnessed names.
      why it matters: "emptying this list means removing a seam the suites drive, not editing a
             word" is true for clock.controlled and vendors.email, where refusing requires deleting
             freezeAt/advance or email.rejectNext — seams suites call. For fixtures.worlds, every
             sut.<key> and oracles.judge, emptying the list means editing the adapter-derived route
             or the oracles witness in capabilities.ts — a word-edit in a source file, exactly what
             the sentence says it is not. The plan itself scopes this claim correctly (plan.md §7:
             "for the clock and the vendor simulator"), and _fixture.ts:22-25 states the weaker,
             true version for the adapter-derived family. This comment overstates what the change
             enforces — the same defect class as Gate 1 finding 12, one file over.
      unverified-runtime-claim: no

  [2] severity: MINOR    tests/at/harness/capabilities.ts:187-196
      claim: The oracles.judge witness's accepting branch above loop accepts ANY transport brand
             other than 'replay-fs' as real — including a brand it has never seen.
      why it matters: The file's own doctrine (capabilities.ts:79-80, 16-21) is that "I found no
             forbidden thing" is never grounds for a verdict. Above loop the accepting condition is
             `transport !== 'replay-fs'` — absence of the one forbidden brand treated as presence of
             an allowed one. A direct call witnessedCapability('oracles.judge', v, { tier:
             'integration', transport: 'bogus' }) returns real with confident-looking evidence text.
             Today the only producer (oracles.ts:1147-1158) constrains the brand through the
             TransportKind union (oracles.ts:179), so this is reachable only via a hand-forged
             transport or evidence — source-edit territory the plan's §7 ceiling already owns —
             which is why this is MINOR and not MAJOR. But the symmetric fix is cheap and is what
             the file preaches: enumerate the accepted brands ('live', 'fake') and refuse the rest,
             as the loop branch's structure already half-does.
      unverified-runtime-claim: no

  [3] severity: MINOR    tests/at/harness/capabilities.ts:175-192 vs tests/at/harness/oracles.ts:1135-1141,1148-1154
      claim: The witness's two tier/transport refusal branches are duplicated defence that no test
             pins: through the only production path oracles.ts throws first, and the selftest
             regexes match BOTH copies' messages, so deleting either copy leaves every test green.
      why it matters: createOracleCapability checks transport.kind and throws before
             witnessedCapability is ever reached with a mismatched combination, so the witness's
             mismatch branches are unreachable in production. The pinning tests
             (oracles.selftest.ts:973-979) assert /loop-tier oracle on a live/ and /filesystem
             replay transport/ — substrings present in both oracles.ts's refusal text AND the
             witness's refusal text — so neither copy is individually load-bearing under test, and
             the conformance suite's new oracles assertion (conformance.selftest.ts:196-199) covers
             only the missing-evidence refusal. Two copies of one rule where neither copy's deletion
             is detectable is precisely the drift shape this tree names as a defect pattern at
             vendors.ts:17-19 ("two copies of a rule is how the two drift apart"). Either pin the
             witness's branches with a direct witnessedCapability call per mismatch, or drop them
             and say the guard lives in oracles.ts alone.
      unverified-runtime-claim: yes — "deleting either copy leaves the suite green" is a runtime
             claim. What settles it: delete the witness's two mismatch throws (or oracles.ts's),
             run `bun run at:selftest`, and observe. The regex overlap itself is verified by reading.
  ```

  No other findings. The central hunt — question 1 — came up empty, and that is worth stating explicitly rather than implied: I found no path by which a value nobody could classify reaches `real`. Every witness branch, the constructor, `sealed()`, and both call-site families were traced; the only unconditional `real` producers are the three declared rows, examined under question 2 below.

  ## Answers to the eleven attack questions

  **1. Can a capability still reach `real` without positive grounds?** No route found. `clock.controlled` and `vendors.email` have exactly two reachable outcomes — stand-in or throw (capabilities.ts:113-153); there is no default, no `null`, no catch that re-labels. `sealed()` (capabilities.ts:201-210) derives both provenance fields from the verdict alone. `stubbedCapabilityNames` (capabilities.ts:253-258) requires the unexported `CAPABILITY` symbol brand, so a hand-forged entry cannot infiltrate a ledger from outside this module. The oracles witness's missing-evidence refusal throws (capabilities.ts:166-174). The only soft spot is finding [2] above: above loop, an *unknown* brand (rather than a forbidden one) is accepted. The malformed-value assertions target exactly the Gate-1 hole and are correctly constructed — `{}` and `{ freezeAt }` genuinely lack the seam; `callable()` walks the prototype chain via property access (capabilities.ts:70-77), so today's class-based `ControlledClock` is not refused (the Gate-1 finding-1 trap is correctly avoided).

  **2. Are the three `real` declarations true in this tree today?** Yes, as read. `config.registry` wraps `createConfigRegistry` — atconfig.ts is the only registry of pinned values in the tree; there is no "real" config source it substitutes for. `sentinels.planted` and `faults.injection` wrap the harness's own marker store and fault router; the adapter seams they consume (scopes, fault points) are not separate capabilities, and above loop the run is still refused by the `sut.*`/`fixtures.worlds` stand-ins, so no false green can escape through them. The declarations are labelled as declarations (capabilities.ts:82-101), which is the honesty the plan promised.

  **3. The adapter-derived route.** (a) The URL cannot name a module other than what executed: `moduleUrl` is the exact specifier passed to `import()` (index.ts:76-79), built from `REPO_ROOT` + requirement (index.ts:59-61), and `join` normalises before `pathToFileURL`, so traversal segments collapse into the named path. `AT_REPO_ROOT` redirection points the loader at another tree — but then the reason names that tree's module, which *is* what executed; the runner's own black-box tests depend on exactly this. A symlinked path component would name the symlink rather than the resolved file, but both denote the same module content — NOTE at most. The requirement-literal check (index.ts:104-112) binds the module's self-declaration to the requested name. (b) No route to the ledger bypasses the witness table or this route: `all` (index.ts:193) is assembled exclusively from `witnessedCapability` and `adapterDerivedCapability` outputs. `h.static` never reaches the ledger at all — it is a `pendingCapability` proxy that throws on any touch, so it is fail-closed rather than unlabelled. One caveat worth recording: `adapterDerivedCapability` is exported and accepts the URL from any caller (the conformance test itself passes a fabricated one at conformance.selftest.ts:147), so the docblock's "cannot be caller-supplied" (capabilities.ts:238-239) is true of the ledger path, not of the function's signature. Since a fabricated URL can only produce a stand-in — the false-*red* direction — this is not a hole.

  **4. The ledger builder and who can reach it.** The design holds: `AtHarness` gained no member (contracts.ts:320-351 verified against the diff — comment changes only), `createHarness` returns only `.value` fields, and no suite imports `harness/index.ts` (grep over `tests/at/suites` is empty). Nothing mechanically stops a suite importing `buildCapabilityLedger` directly — the rulings file already records this as the tree's existing barrier, not a new weakness. The capability wrapper is frozen shallowly: verdict fields cannot be overwritten, but `value` is a live object and `all` is a merely `readonly`-typed array. That is inconsequential here — mutating `value` mutates the same object the suite legitimately drives, and a forged entry without the unexported brand symbol is filtered out of `stubbedCapabilityNames` anyway.

  **5. The object judged is the object handed over.** Verified for all eight members: `clock`, `config`, `fixtures`, `sentinels`, `faults`, `vendors`, `oracles` are each `ledger.<name>.value` in one expression (index.ts:226-240), and `sut` is rebuilt from `ledger.sut` entries (index.ts:228). The judged objects are also what the rest of construction consumes — `loadAdapter` is handed `clock.value` and `config.value` (index.ts:164), not the raw instances — so even the adapter sees the witnessed object. No member is assigned from a separately-held variable. Gate-1 finding 8 is closed by construction.

  **6. Would the new assertions actually fail?** Yes, each new-guard assertion has teeth, traced by branch: unwitnessed-name (conformance.selftest.ts:164-174) goes red if the table lookup defaults in either direction; malformed-value (:176-210) goes red if a witness returns `real` on no-seam — I traced the reverted-witness path and it classifies `{}` as real only through the oracles branch's shape, never the seam witnesses, so the throw assertions bite; the ledger-reason assertions (:212-239) fail against generic reason strings because they require 'freezeAt/advance', 'email.rejectNext', '_fixture.ts' as substrings; the accepting-branch assertion (:241-255) asserts `realEvidence` contains 'article', so a refuse-everything guard fails it and a refuse-nothing guard fails the malformed set. The discriminating tail (:205-209) pins the prototype-chain callability. The rewritten preserved test (:139-150) correctly routes through `adapterDerivedCapability` and still proves self-report is ignored. The integration-tier assertion (:257-270) is honestly scoped by its own comment — it proves declaration, not the gate — matching S4 item 7 exactly.

  **7. The exact five-name ledger.** Holds. At loop: `clock.controlled` (seam → stand-in), `vendors.email` (seam → stand-in), `fixtures.worlds` + `sut.notifications` (adapter route → stand-in), `oracles.judge` (loop + replay-fs → stand-in), and `config.registry`/`sentinels.planted`/`faults.injection` (declared real, absent from the list). `stubbedCapabilityNames` sorts, yielding exactly `['clock.controlled','fixtures.worlds','oracles.judge','sut.notifications','vendors.email']` — matching conformance.selftest.ts:281-287. Names can be added or dropped only by editing the witnesses or the adapter's exported `sut` keys, both visible source edits.

  **8. The oracle was routed, not rewritten.** oracles.ts's two refusals are intact and textually unchanged (diff shows only the call-site swaps and docblock). The two copies cannot disagree *as constructed* — both key on the same two strings, and the transport brand reaches the witness as `transport.kind` unchanged. The residual risk is drift between the copies, and that neither copy is individually pinned (the selftest regexes match both messages) — that is finding [3]. The witness's refusals make no existing assertion unreachable; oracles.ts still throws first, so oracles.selftest.ts:960-991 keeps its meaning.

  **9. The runner's generated adapters.** They survive the new construction path, by reading: both generators emit `sut: { probe: … }` with no fault/sentinel seams and a `requirement` literal (runner-blackbox.selftest.ts:54-73, runner-expect.selftest.ts:48-58); `buildCapabilityLedger` tolerates absent seams via `createSentinels(undefined)`/`createFaults(undefined)` (index.ts:168-169), constructs `sut.probe` on the adapter route with no name lookup (index.ts:180-182), and the literal check passes since both generators emit it. `teardown` composes `adapter.teardown()` + `worlds.teardown()` (index.ts:194-197) and the generated adapters provide `teardown`. The two black-box cases that use the literal-less `ADAPTER_BODY` are deliberate negative cases. Whether they *actually* stay green is the fix pass's run — unverified here, and reading gives no reason to expect red.

  **10. What the comments now claim.** Mostly true, with one exception. The `_fixture.ts` header is now accurate and correctly bounded ("a visible edit to a named witness… a bound on how cheap the lie is" — the over-strong "can only ever be satisfied by the real implementation" sentence is gone). The capabilities.ts header's claims check out against the code. The oracles.ts docblock's claims check out. The exception is finding [1]: contracts.ts:327-330 overstates the enforcement for the adapter-derived names. Also noted under question 3: capabilities.ts:238-239's "cannot be caller-supplied" is true of the route, not of the exported function's signature — defensible in context, but it is the kind of sentence this item exists to keep honest.

  **11. Plan promises vs. code.** Checked §4 step by step: S1's three surviving assertions exist (conformance.selftest.ts:164-210); S2's constructor/closed-table/refusal shape is as specified and `Capability` was *not* converted to a type alias (capabilities.ts:50 — the dropped finding-10 hardening stayed dropped); S3's six-name table and adapter route match D3/D4, and no call site passes a provenance; S4's seven assertions are all present with the new-guard/preserved split honoured, including the honest scoping of the integration assertion; S5's record corrections landed in all three files and the exact-zero grep passes; S6's runtime rows belong to the next pass per the boxed note. The draft-pass rulings (a) `realEvidence` and (b) no `stand-in — ` prefix are both implemented. Section 7's stated ceiling is reached: the four reference capabilities have no API route to `real`, and the judged-is-handed-over property is structural. Nothing the plan promised was found quietly missing.

  **Verdict:** no BLOCKER, no MAJOR. Three MINOR findings — one comment that overclaims (contracts.ts:329), one accepting branch that accepts by absence rather than by enumeration (capabilities.ts:193-196), and one duplicated guard neither of whose copies is individually pinned (capabilities.ts:175-192 / oracles.ts). The central defect the Gate-1 amendment exists to close is closed as far as reading can establish.

