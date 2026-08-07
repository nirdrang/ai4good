SOURCE   C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\artifacts-AI4DEV-48\gate2-kimi.md
REVIEWER kimi, kimi-code/k3, effort high, read-only, Gate 2 critique of the branch diff at commit a871d59
COUNT    3 findings in source → 3 extracted (plus 11 numbered attack-question answers, condensed below, and closing scope-check + verdict lines)
NOTES    none — file is complete, not truncated, ends with a verdict line.

## Scope check (raw lines 17)
"the diff touches `capabilities.ts`, `index.ts`, `oracles.ts` (the two call sites plus the docblock), `conformance.selftest.ts`, `contracts.ts` (comments only), `_fixture.ts` (header only), and `loop/items/AI4DEV-48/`. `registry.ts`, `runner.ts`, `oracles.selftest.ts` and `tests/at/expected/req-016.json` are untouched — the may-not-touch list holds. A repository grep for `realCapability|standInCapability` outside `loop/items/` returns exactly zero hits (checked `*.ts`/`*.tsx`/`*.md`), so S5's exact-zero criterion is met as far as static reading can confirm."

## Findings

[1] severity: MINOR   tests/at/harness/contracts.ts:327-330
    claim: "The new comment generalises the self-defeating-lie property to every name on the
           stand-in list, but it holds only for the two seam-witnessed names."
    why it matters: "\"emptying this list means removing a seam the suites drive, not editing a
           word\" is true for clock.controlled and vendors.email, where refusing requires deleting
           freezeAt/advance or email.rejectNext — seams suites call. For fixtures.worlds, every
           sut.<key> and oracles.judge, emptying the list means editing the adapter-derived route
           or the oracles witness in capabilities.ts — a word-edit in a source file, exactly what
           the sentence says it is not. The plan itself scopes this claim correctly (plan.md §7:
           \"for the clock and the vendor simulator\"), and _fixture.ts:22-25 states the weaker,
           true version for the adapter-derived family. This comment overstates what the change
           enforces — the same defect class as Gate 1 finding 12, one file over."
    unverified-runtime-claim: no
    raw: gate2-kimi.md lines 22-34

[2] severity: MINOR   tests/at/harness/capabilities.ts:187-196
    claim: "The oracles.judge witness's accepting branch above loop accepts ANY transport brand
           other than 'replay-fs' as real — including a brand it has never seen."
    why it matters: "The file's own doctrine (capabilities.ts:79-80, 16-21) is that \"I found no
           forbidden thing\" is never grounds for a verdict. Above loop the accepting condition is
           `transport !== 'replay-fs'` — absence of the one forbidden brand treated as presence of
           an allowed one. A direct call witnessedCapability('oracles.judge', v, { tier:
           'integration', transport: 'bogus' }) returns real with confident-looking evidence text.
           Today the only producer (oracles.ts:1147-1158) constrains the brand through the
           TransportKind union (oracles.ts:179), so this is reachable only via a hand-forged
           transport or evidence — source-edit territory the plan's §7 ceiling already owns —
           which is why this is MINOR and not MAJOR. But the symmetric fix is cheap and is what
           the file preaches: enumerate the accepted brands ('live', 'fake') and refuse the rest,
           as the loop branch's structure already half-does."
    unverified-runtime-claim: no
    raw: gate2-kimi.md lines 36-50

[3] severity: MINOR   tests/at/harness/capabilities.ts:175-192 vs tests/at/harness/oracles.ts:1135-1141,1148-1154
    claim: "The witness's two tier/transport refusal branches are duplicated defence that no test
           pins: through the only production path oracles.ts throws first, and the selftest
           regexes match BOTH copies' messages, so deleting either copy leaves every test green."
    why it matters: "createOracleCapability checks transport.kind and throws before
           witnessedCapability is ever reached with a mismatched combination, so the witness's
           mismatch branches are unreachable in production. The pinning tests
           (oracles.selftest.ts:973-979) assert /loop-tier oracle on a live/ and /filesystem
           replay transport/ — substrings present in both oracles.ts's refusal text AND the
           witness's refusal text — so neither copy is individually load-bearing under test, and
           the conformance suite's new oracles assertion (conformance.selftest.ts:196-199) covers
           only the missing-evidence refusal. Two copies of one rule where neither copy's deletion
           is detectable is precisely the drift shape this tree names as a defect pattern at
           vendors.ts:17-19 (\"two copies of a rule is how the two drift apart\"). Either pin the
           witness's branches with a direct witnessedCapability call per mismatch, or drop them
           and say the guard lives in oracles.ts alone."
    unverified-runtime-claim: yes — reviewer's own words: "\"deleting either copy leaves the suite
           green\" is a runtime claim. What settles it: delete the witness's two mismatch throws
           (or oracles.ts's), run `bun run at:selftest`, and observe. The regex overlap itself is
           verified by reading."
    raw: gate2-kimi.md lines 52-70

## Pre-findings-block statement (raw line 73)
"No other findings. The central hunt — question 1 — came up empty, and that is worth stating explicitly rather than implied: I found no path by which a value nobody could classify reaches `real`. Every witness branch, the constructor, `sealed()`, and both call-site families were traced; the only unconditional `real` producers are the three declared rows, examined under question 2 below."

## Answers to the eleven attack questions (condensed but faithful; substantive claims kept verbatim where load-bearing)

1. **Can a capability still reach `real` without positive grounds?** "No route found." clock.controlled and vendors.email have exactly two reachable outcomes — stand-in or throw; no default/null/re-labelling catch. sealed() derives both provenance fields from the verdict alone. stubbedCapabilityNames requires the unexported CAPABILITY symbol brand. The oracles witness's missing-evidence refusal throws. "The only soft spot is finding [2] above." Malformed-value assertions correctly target the Gate-1 hole; callable() walks the prototype chain, so today's class-based ControlledClock is correctly not refused (Gate-1 finding-1 trap avoided).

2. **Are the three `real` declarations true in this tree today?** "Yes, as read." config.registry wraps createConfigRegistry (only registry of pinned values, nothing "real" it substitutes for). sentinels.planted and faults.injection wrap the harness's own marker store/fault router; their adapter seams aren't separate capabilities and are still gated by the sut.*/fixtures.worlds stand-ins, so no false green escapes. Declarations are labelled as declarations (capabilities.ts:82-101).

3. **The adapter-derived route.** (a) moduleUrl is the exact specifier passed to import(), built from REPO_ROOT + requirement, join normalises so traversal collapses; AT_REPO_ROOT redirection names the tree that actually executed; a symlinked path component would name the symlink but denote the same executed content — "NOTE at most"; requirement-literal check binds self-declaration to requested name. (b) No route bypasses the witness table: `all` is assembled exclusively from witnessedCapability/adapterDerivedCapability outputs; h.static is a pendingCapability proxy that throws on touch (fail-closed). Caveat: "adapterDerivedCapability is exported and accepts the URL from any caller (the conformance test itself passes a fabricated one at conformance.selftest.ts:147), so the docblock's \"cannot be caller-supplied\" (capabilities.ts:238-239) is true of the ledger path, not of the function's signature." Since a fabricated URL can only produce a stand-in (false-red direction), "this is not a hole."

4. **The ledger builder and who can reach it.** Design holds: AtHarness gained no member, createHarness returns only .value fields, no suite imports harness/index.ts (grep over tests/at/suites empty). "Nothing mechanically stops a suite importing buildCapabilityLedger directly — the rulings file already records this as the tree's existing barrier, not a new weakness." Wrapper is frozen shallowly: verdict fields immutable, but value is a live object and `all` is only readonly-typed. "That is inconsequential here."

5. **The object judged is the object handed over.** Verified for all eight members (clock, config, fixtures, sentinels, faults, vendors, oracles each ledger.<name>.value; sut rebuilt from ledger.sut entries). loadAdapter is handed clock.value/config.value, not raw instances. "No member is assigned from a separately-held variable. Gate-1 finding 8 is closed by construction."

6. **Would the new assertions actually fail?** "Yes, each new-guard assertion has teeth" — traced by branch for unwitnessed-name, malformed-value (traced {} classifies as real only through the oracles branch's shape, never seam witnesses), ledger-reason assertions, accepting-branch assertion, discriminating tail, rewritten preserved test, and integration-tier assertion (honestly scoped per its own comment — "proves declaration, not the gate — matching S4 item 7 exactly").

7. **The exact five-name ledger.** "Holds." Enumerated: clock.controlled, vendors.email, fixtures.worlds + sut.notifications, oracles.judge as stand-ins; config.registry/sentinels.planted/faults.injection declared real and absent from list. stubbedCapabilityNames sorts to exactly `['clock.controlled','fixtures.worlds','oracles.judge','sut.notifications','vendors.email']`, matching conformance.selftest.ts:281-287. Names addable/droppable only via visible source edits.

8. **The oracle was routed, not rewritten.** oracles.ts's two refusals are intact and textually unchanged (diff shows only call-site swaps and docblock). "The two copies cannot disagree as constructed." Residual risk: drift between copies, neither individually pinned — "that is finding [3]." Existing assertions (oracles.selftest.ts:960-991) keep their meaning.

9. **The runner's generated adapters.** "They survive the new construction path, by reading" — both generators emit sut:{probe:…} with no fault/sentinel seams and a requirement literal; buildCapabilityLedger tolerates absent seams; sut.probe constructed with no name lookup; teardown composes correctly. Two black-box cases using literal-less ADAPTER_BODY are deliberate negative cases. "Whether they actually stay green is the fix pass's run — unverified here, and reading gives no reason to expect red."

10. **What the comments now claim.** "Mostly true, with one exception." _fixture.ts header now accurate and correctly bounded (over-strong sentence removed). capabilities.ts header and oracles.ts docblock claims check out. "The exception is finding [1]: contracts.ts:327-330 overstates the enforcement for the adapter-derived names." Also noted: capabilities.ts:238-239's "cannot be caller-supplied" is true of the route not the function's signature — "defensible in context, but it is the kind of sentence this item exists to keep honest."

11. **Plan promises vs. code.** Checked §4 step by step: S1's three surviving assertions exist; S2's constructor/closed-table/refusal shape as specified and Capability was NOT converted to a type alias (dropped finding-10 hardening stayed dropped); S3's six-name table and adapter route match D3/D4, no call site passes a provenance; S4's seven assertions present with new-guard/preserved split honoured, including honest scoping of integration assertion; S5's record corrections landed in all three files, exact-zero grep passes; S6's runtime rows belong to next pass per boxed note. Draft-pass rulings (a) realEvidence and (b) no "stand-in — " prefix both implemented. "Section 7's stated ceiling is reached... Nothing the plan promised was found quietly missing."

## Verdict (verbatim, raw line 99)
"no BLOCKER, no MAJOR. Three MINOR findings — one comment that overclaims (contracts.ts:329), one accepting branch that accepts by absence rather than by enumeration (capabilities.ts:193-196), and one duplicated guard neither of whose copies is individually pinned (capabilities.ts:175-192 / oracles.ts). The central defect the Gate-1 amendment exists to close is closed as far as reading can establish."
