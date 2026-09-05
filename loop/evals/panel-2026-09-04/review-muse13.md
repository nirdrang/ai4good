## Findings

### 1. [warning] Live prose still names the parked ledger as the live mechanism
**Location**: `tests/at/suites/req-001/_fixture.ts:7`, `tests/at/suites/req-016/_fixture.ts:25`, `tests/at/harness/local-stack.ts:496,1013`, `tests/at/harness/registry.ts:262,297`, `tests/at/harness/suite-adapters.ts:10`, `tests/at/suites/req-001/_integration.ts:1241`
**Finding**: Comments describe `adapterDerivedCapability()` in `tests/at/harness/capabilities.ts`, `live-email.ts`, `tests/at/typeprobes/sut-seam*.probe.ts`, and `pendingMethodProxy` as current. All live under `loop/parked/v1/` now; no live import exists.
**Evidence**: `git grep` for live imports of `capabilities|attestation|live-email` returns nothing, but the six prose hits above remain. `contracts.ts` was cleaned of its `typeprobes/` mentions while `registry.ts` was not, so the tree contradicts itself. A reader cannot verify the documented widening attack because the path is dead.
**Suggestion**: Repoint to `loop/parked/v1/...` as history or delete; do not leave live headers claiming a stamp that no longer runs.

### 2. [warning] Boolean `live` plus hand-written throws can go green over stub data
**Location**: `tests/at/harness/index.ts:createHarness`, `tests/at/harness/registry.ts:aboveLoopStandInRefusal`, `tests/at/suites/req-001/_live.ts` six terminal throws
**Finding**: Old gate computed per-capability verdicts: `backedSutMethods` closed enumeration plus `pendingMethodProxy`, checked at load. New gate is `if (tier === 'loop' || live) return null`, where `live` is true whenever `_live.ts` exists. Nothing checks the six names or that backed methods hit the stack.
**Evidence**: Call chain `openWorld -> createHarness -> loadLiveAdapterModule -> createLiveAdapter({stack}) -> live:true -> no refusal -> sut.accounts.<method>()`. If a future edit implements an unbacked method as canned data instead of `throw new CapabilityPending`, or copies loop storage into `_live.ts`, the run stays green. Old `backedSutMethods` absence threw at load; new relies on author memory plus `AccountsSut` typing.
**Suggestion**: Restore a load-time closed check: assert the live `accounts` object has exactly the contract keys and that the six unbacked names throw `CapabilityPending`.

### 3. [warning] Shared module changed drive requests, not just their home
**Location**: `tests/at/harness/live-stack.ts:authPost,functionPost,mailMessagesFor,verifyLinksFor`, `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts`
**Finding**: Adapter mail path is preserved (search plus raw), but the drive is not behavior-preserving.
**Evidence**: Old drive signup/signin sent `{apikey}` only; new `authPost` adds `Authorization: Bearer <anon>`. Old drive mail polled `GET /messages` plus `GET /message/{ID}` JSON `Text/HTML`, `1s x 20`, regex on any `/auth/v1/verify`, only `&amp;` decoded. New drive uses `GET /search?query=to:...` plus `GET /message/{ID}/raw`, `250ms` to `20s`, full quoted-printable decode, `type=signup` filter, trailing-punctuation strip. Server-side versus client-side filtering, raw versus rendered body, and an added auth header are different requests with different failure modes.
**Suggestion**: Call this an intentional drive fix with its own evidence, or keep the drive on its old endpoints.

### 4. [warning] `mailMessagesFor` turns a bad catcher answer into an undeclarable red
**Location**: `tests/at/harness/live-stack.ts:mailMessagesFor`, `verifyLinksFor`
**Finding**: `mailIdentification` wraps every malformed probe answer in a named refusal; `mailMessagesFor` does `JSON.parse(search.text)` bare.
**Evidence**: `search.status === 200` with non-JSON body throws raw `SyntaxError`. `expected.ts` only declares `capability-pending` and `pending`, so `--expect` reports shape mismatch instead of a named refusal. `verifyLinksFor` also checks the deadline only after a full `mailMessagesFor` round (search plus N raw reads), so one slow round overshoots 20s and the `250ms` loop hammers the catcher.
**Suggestion**: Wrap the parse with the same named refusal style and check the deadline inside the per-message raw loop with backoff.

### 5. [warning] `live-stack.selftest.ts` proves only the pure helpers
**Location**: `tests/at/harness/live-stack.selftest.ts`
**Finding**: Selftest imports `verifyLinksIn, parseStatusJson, stackFromStatusJson, redact*` only. `authPost, functionPost, mailIdentification, mailMessagesFor, verifyLinksFor, followLink, sqlClient` — the exact boundary the share claims to preserve — have no mocked-fetch/SQL contract test.
**Evidence**: The pin cited (16 green, 21 red, drive 11 of 11) needs a running resettable stack and is not part of `at:selftest`. A header or endpoint regression in the shared module passes selftest and typecheck clean.
**Suggestion**: Add fetch-mocked tests asserting URLs, `apikey`/`Authorization`/`x-forwarded-for` headers, and search versus raw endpoints for both callers.

### 6. [nit] Duplicated SQL client shape and thin re-export
**Location**: `tests/at/harness/live-stack.ts:BunSqlClient`, `tests/at/harness/local-stack.ts:BunSqlClient`, `tests/at/harness/runner.ts:export { bunExecutable, childEnv }`
**Finding**: Two identical `BunSqlClient`/`BunSqlCtor` declarations; runner re-exports two `local-stack.ts` functions callers could import directly.
**Evidence**: Same five-line interface in both stack modules; `runner.ts` adds indirection without behavior. `RealClock` is also now a public unbranded constructor after `AttestedRealClock` was removed, but `now()` is just `Date.now()` so this is hygiene only.
**Suggestion**: Share one SQL-client type; import `bunExecutable`/`childEnv` from `local-stack.ts` at use sites.
