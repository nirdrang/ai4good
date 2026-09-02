# Design for AI4DEV-87 (harness shrinks to the per-id gate)

Written by the lead from the item text, the previous item's explanation (`loop/items/AI4DEV-86/artifacts/how/explanation.md`, sections 6 to 9), its critic reports, and its interrogate rulings ("Consider" list: extract the stack lifecycle out of runner.ts). No arena, by the founder's ruling in the item text.

## What stays, stated once

- `at:check` and the bijection (`check.ts`), `atTest` and `bindSuite` (`registry.ts`), per-id grading in the runner, the `--expect` manifests and `expected.ts` with both red kinds: `pending` (with a phase) and `capability-pending` (with names).
- The three manifests are byte-identical before and after. The item text says "unchanged manifests" for the loop runs and "the same 16 ids" for the integration run; this design keeps every red kind and every red name as it is, so all three files stay unchanged.
- The loop tier: `ControlledClock`, `FixtureWorldStore`, the config registry, the email provider sim, sentinels, faults, guards, and both `_fixture.ts` adapters. Frozen (scope 5, "not yet").
- The one stack, the lock, the CLI seam, the identity read (twice), the reset, the migration proof, the lifetime pin, the evidence line, the allowlisted child environment. They move; they do not change.

## What goes, and what takes its place

### 1. The provenance ledger (unit 1)

Today every harness member is a `Capability<T>` classified by a witness table (`capabilities.ts`, 545 lines); `registry.ts` refuses any `open()` above loop while the ledger holds a stand-in; live members are granted `real` on a brand that only the attestation round trip mints (`attestation.ts`, `clock.ts`, `live-email.ts`); `live-ledger.selftest.ts`, three provenance describe blocks in `conformance.selftest.ts`, and the type probes (`typeprobes/`, `type-invention.selftest.ts`) guard all of that.

Replacement: **liveness decided by file presence before anything is built** (as first designed the boolean sat on the harness; the review panel moved the decision ahead of construction and off the type, rulings item 1), and one pure function in `registry.ts`:

```ts
export function aboveLoopStandInRefusal(tier: Tier, live: boolean, sutKey: string): CapabilityPending | null {
  if (tier === 'loop' || live) return null;
  return new CapabilityPending(['fixtures.worlds', `sut.${sutKey}`]);
}
```

`openWorld` asks `liveAdapterExists` and throws `aboveLoopStandInRefusal` before `createHarness`. `createHarness` above loop with no live adapter throws rather than loading the loop fixture. Nothing is built above loop without a live adapter. That is exactly the text the req-016 integration manifest declares for all twelve ids (`capability-pending: fixtures.worlds, sut.notifications`), so the manifest does not move.

`CapabilityPending` moves beside `AtPending` (first into `registry.ts`; since rulings item 8 both live in the leaf `pending.ts` and `registry.ts` re-exports them), byte-for-byte the same message (`CAPABILITY PENDING — <names joined by ", ">`, `name = 'CapabilityPending'`), because `expected.ts` rebuilds that text. `h.static` stays a refusing proxy that throws `CapabilityPending(['H3 static provider scan'])` on any access (the loop manifest for AT-016.01 declares that text); the proxy helper moves into `index.ts` as `refusing<T>(...names)`.

The unbacked req-001 integration ids keep their exact reds by explicit throws in `_live.ts`: `registerWithProvider`, `registerWithGithub`, `signInWithProvider`, `sendDiscoveryMessage`, `discoveryMessagesBy`, `publicSignupAccountTypes` are written out as methods that throw `CapabilityPending(['sut.accounts.<method>'])`. No proxy, no enumeration. The two bodies that refuse by name (`at00105`, `at00110`) stay as they are.

The attestation round trip goes with the brand: `attestation.ts` is parked, the runner no longer mints a nonce or writes `at_runtime.slot_attestation`, `AT_SLOT_ATTESTATION` leaves the child environment. What proves the child talks to the prepared stack is what the runner already proves before it spawns the child: the identity read from the CLI's own container names, twice, the reset on that read, and the migration proof. The child reads the five `AT_SUPABASE_*` coordinates the runner handed it.

Cost, stated: at the loop tier nothing can tell a real member from a stand-in any more. Above loop, a suite with no `_live.ts` is refused by a boolean instead of a computed verdict. Both are the costs the item text accepts.

### 2. The live adapter and the mail reader (unit 2)

Today `_live.ts` (944 lines) implements the loop contract `AccountsSut` over HTTP and SQL, exports a `backedSutMethods` enumeration the ledger grants over, and receives an attested `LiveVendors` for Mailpit; `live-email.ts` (182 lines) is the Mailpit reader granted on a brand; `_integration.ts` (1151 lines) holds the sixteen green bodies and the two explicit refusals; the drive script under `.claude/skills/verify-ai4good/scripts/` has its own copy of the HTTP, Mailpit, SQL, and redaction helpers.

Replacement: **one shared module, `tests/at/harness/live-stack.ts`** (a module with no acceptance id lives under `tests/at/harness/`, project CLAUDE.md section 5), imported by both `_live.ts` and the drive script:

- `Stack` (five coordinates) with `stackFromEnv()` (the child) and `stackFromStatus(repoRoot)` (the drive, from `supabase status -o json`);
- `authPost(stack, path, body, bearer?)`, `functionPost(stack, name, body, bearer, ip?)`, both returning `{ status, json }`;
- `verifyLinksIn(rawMessage, kind)` (pure: quoted-printable decoding, `/auth/v1/verify` links filtered by `type=`), `mailMessagesFor(stack, address)` and `verifyLinksFor(stack, address, kind)` (the bounded poll), `followLink(url)`;
- `sqlClient(stack)`;
- the three redaction helpers.

`_live.ts` keeps its name and its role (the integration tier's system under test for req-001) and shrinks: no `requirement` self-declaration, no `backedSutMethods`, no attested vendors, no `LiveVendors`; `createLiveAdapter({ stack })` returns `{ sut, fixtures: { world(name) }, teardown }` as now, with `sut` still typed `AccountsSut` so the sixteen bodies and `ctx.open()` do not change. `live-email.ts` is parked; `h.vendors` above loop becomes the refusing proxy for `vendors.email` (no body reads it above loop; `TierHarness` already narrows it). The lifetime check `lifetimeProblem` stays in `_live.ts` and keeps its selftest.

The drive script imports the shared module and keeps its eleven checks and its transcript shape. The pin for the drive was 11 of 11; since rulings item 4 the Doctor step runs two more checks (the mail catcher's identification and the edge runtime's functions mount) and the pin is 13 of 13 on the final head.

Why the bodies do not change: the item says "thin atTest over the drive helpers". The bodies already are the assertions and nothing else; what sat between them and the stack was the ledger, the brand, the enumeration, and the proxy. Those go. The sut methods are the accounts helpers, and a body that called `functionPost` directly would parse the same JSON twenty times over.

### 3. The stack lifecycle (unit 3)

`runner.ts` (1625 lines) holds arguments, grading, main, and the whole one-stack section (about 900 lines: `readLocalConfig`, the lock, the CLI seam, `parseStackStatus`, `localStackProblems`, readiness, migrations, `resetLocalDatabase`, `containerNames`, the sealed `StackIdentityRead`, `identityVerdict`, `proveTarget`, `lifetimePinProblem`, `configDriftProblems`, `prepareLocalStack`, `childCoordinates`, `treeState`, `evidenceLine`).

Replacement: **`tests/at/harness/local-stack.ts`** holds that section, unchanged in behavior; `runner.ts` imports `readLocalConfig`, `lifetimePinProblem`, `acquireStackLock`, `prepareLocalStack`, `childCoordinates`, `evidenceLine`, and the types it names. `local-stack.ts` imports `INSTALL_ROOT`, `REPO_ROOT` from `check.ts` and `AT_CONFIG` from `atconfig.ts`; it imports nothing from `runner.ts`, so there is no cycle (the previous item's arena kept the section in the runner because the pool made a cycle; the pool is parked). `childEnv`, `bunExecutable`, `redact`, `diagnostic` move too if the lifecycle needs them; the runner imports them back. The selftest describe blocks that drive the lifecycle move from `runner.selftest.ts` into `local-stack.selftest.ts` unchanged; the runner selftest keeps the child-environment, exit-code, and lock-release blocks that drive the runner.

### 4. Scope 5, not yet

The req-016 stand-in fixture and the modules only it uses (sentinels, faults, vendors sim, guards, fixture worlds) stay frozen until req-016's product code lands. Nothing in this item touches them beyond the imports unit 1 must correct. The pull request says so under Scope and lists the work under "Not done here".

## Units, in order, each ending green

| unit | writer | parks | edits | pin |
|---|---|---|---|---|
| 1 ledger out | feature lane (grok@xhigh) | capabilities.ts, attestation.ts, live-ledger.selftest.ts, type-invention.selftest.ts, typeprobes/ | index.ts, registry.ts, contracts.ts, clock.ts, live-email.ts, runner.ts (nonce, env), runner.selftest.ts, conformance.selftest.ts, vendors.selftest.ts, runner-expect.selftest.ts, expected.ts (prose), expected.selftest.ts (prose), _integration.ts (import), _live.ts (explicit refusals), tests/at/tsconfig.json, tests/at/README.md, parked README | typecheck; at:selftest; both loop --expect; integration --expect 16 green 21 red |
| 2 shared stack module | feature lane | live-email.ts | new tests/at/live/stack.ts and its selftest (pure parts first), _live.ts, index.ts (live path), contracts.ts (TierHarness), drive script, verify skill prose | the same four, plus the drive 11 of 11 |
| 3 lifecycle module | feature lane | nothing | new local-stack.ts and local-stack.selftest.ts, runner.ts, runner.selftest.ts, README prose | the same four |

Each unit is one commit by one writer in this worktree. The writer runs the pin before committing and pastes the results into its report. The lead reads the diff of every unit against this document.

## Reader-load claim, to be measured in the PR body

Before: a body reaches the stack through `atTest` → `open()` → `createHarness` → `buildLiveLedger` → `attestSlot` → `witnessedCapability`/`liveSutCapability` → `pendingMethodProxy` → `_live.ts` method. After: `atTest` → `open()` → `createHarness` → `_live.ts` method. Lines under `tests/at/harness` and `tests/at/typeprobes` before and after, counted by the mechanical at the verify station.
