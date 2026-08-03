kimi : • Let me read the prompt file and get the diff. loop/items/AI4DEV-19/brief.md                      |  145 +
At line:1 char:404
+ ... cation $wt; kimi -m kimi-code/k3 -p "Read loop/items/AI4DEV-19/gate2- ...
+                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (• Let me read t...       |  145 +:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
 loop/items/AI4DEV-19/design.md                     |  228 +
 loop/items/AI4DEV-19/executor-brief.md             |  148 +
 loop/items/AI4DEV-19/gate0-critique.md             |   41 +
 loop/items/AI4DEV-19/gate0-prompt.txt              |   54 +
 loop/items/AI4DEV-19/gate0-rulings.md              |  136 +
 loop/items/AI4DEV-19/gate0-run.log                 | 6603 ++++++++++++++++++++
 loop/items/AI4DEV-19/gate2-prompt.txt              |   68 +
 loop/items/AI4DEV-19/proof-green.txt               |   29 +
 loop/items/AI4DEV-19/proof-oracle.txt              |   92 +
 loop/items/AI4DEV-19/proof-red.txt                 |  215 +
 tests/at/expected/req-016.json                     |   12 +-
 tests/at/harness/conformance.selftest.ts           |  192 +
 tests/at/harness/faults.ts                         |   87 +
 tests/at/harness/index.ts                          |   35 +-
 tests/at/harness/sentinels.ts                      |   62 +
 tests/at/harness/suite-adapters.ts                 |   11 +
 tests/at/suites/req-016/_fixture.ts                |   93 +-
 .../at/suites/req-016/c-reliability-guard.test.ts  |   23 +-
 19 files changed, 8256 insertions(+), 18 deletions(-)
This is a substantial adversarial review. Let me look at the diff and the relevant files. The code files are: sentinels.ts, faults.ts, 
index.ts, suite-adapters.ts, conformance.selftest.ts, _fixture.ts, c-reliability-guard.test.ts, req-016.json. Plus context docs.

  This is substantial enough to delegate to a coder/explore subagent. But it's a review — I could do it myself. The diff is mostly docs 
(6603-line log). The code diff is maybe ~600 lines. I'll review directly but need to read files. Let me get the diff for code files first, 
then read full files.diff --git a/tests/at/expected/req-016.json b/tests/at/expected/req-016.json
index a2043b2..d77c25e 100644
--- a/tests/at/expected/req-016.json
+++ b/tests/at/expected/req-016.json
@@ -8,22 +8,16 @@
         "AT-016.04",
         "AT-016.05",
         "AT-016.06",
+        "AT-016.07",
         "AT-016.08",
+        "AT-016.09",
         "AT-016.10",
         "AT-016.12"
       ],
       "red": {
         "AT-016.01": {
           "kind": "capability-pending",
-          "capabilities": ["H3 static provider scan", "H3 sentinels", "H5 email provider simulator"]
-        },
-        "AT-016.07": {
-          "kind": "capability-pending",
-          "capabilities": ["H3 fault injection and process restart"]
-        },
-        "AT-016.09": {
-          "kind": "capability-pending",
-          "capabilities": ["H3 fault injection and process restart"]
+          "capabilities": ["H3 static provider scan", "H5 email provider simulator"]
         },
         "AT-016.11": {
           "kind": "capability-pending",
diff --git a/tests/at/harness/conformance.selftest.ts b/tests/at/harness/conformance.selftest.ts
index 314b142..4b0512f 100644
--- a/tests/at/harness/conformance.selftest.ts
+++ b/tests/at/harness/conformance.selftest.ts
@@ -11,9 +11,11 @@
 import { describe, expect, it } from 'vitest';
 
 import { standInCapability, stubbedCapabilityNames } from './capabilities.ts';
+import { createFaults } from './faults.ts';
 import { createFixtureSeed, FixtureWorldStore, LIFECYCLE_STATES } from './fixtures.ts';
 import { bijectionProblems, type SuiteRegistration } from './check.ts';
 import { createHarness } from './index.ts';
+import { createSentinels } from './sentinels.ts';
 import {
   faultFiredProblem,
   faultPointProblem,
@@ -39,6 +41,11 @@ import type { NotificationsSut, World } from '../suites/req-016/_contract.ts';
 const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
 const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';
 
+/** The fault point AT-016.09 arms, addressed the way that suite addresses it. */
+const FAULT_POINT = 'notifications.between_transition_and_event_write';
+/** The only store the req-016 adapter registers as scannable. */
+const SENTINEL_SCOPE = 'notifications.delivery_bodies';
+
 describe('the five false-green reproductions', () => {
   it('refuses a passing body that never opens a world or consumes trusted evidence', async () => {
     expect(testUseProblem(0, 0)).toContain('never opened');
@@ -264,6 +271,191 @@ describe('the centralized generic guards refuse as well as accept', () => {
   });
 });
 
+/**
+ * H3's wall, and the reason it is not a formality.
+ *
+ * The four `describe` blocks above test the guards AS PURE FUNCTIONS. That is not enough, and this
+ * file says so about itself thirty lines up: a problem computed and not acted on is "this tree's own
+ * recurring false-green shape". Nothing above proves that `plant`, `at`, `clear` and `processRestart`
+ * ever CALL the predicate that would refuse them.
+ *
+ * And for sentinels the stakes are higher still. `req-016` is the only suite that exists; its one
+ * sentinel consumer, `AT-016.01`, throws at `h.static.providerClientImporters()` on line 28 and never
+ * reaches `plant()` on line 50, and `scan()` has no caller anywhere in the tree. So a completely
+ * NO-OP `Sentinels` would satisfy `at:verify req-016 --tier loop --expect` from end to end. These
+ * tests are therefore not supporting evidence for half this capability — they are the entire
+ * evidence, and every one of them is written so that a no-op fails it.
+ *
+ * They drive `createHarness()` rather than hand-built parts wherever the real fixture can produce the
+ * condition, for the reason the clock test gives: what is worth proving is the object a suite is
+ * really handed. Only the two conditions the conforming fixture cannot produce — an unchanged epoch,
+ * and an adapter offering no seam at all — are built from stubs, and each says so where it sits.
+ */
+describe('the H3 wall: sentinels and fault injection call the guards, and refuse', () => {
+  it('plants a usable marker and refuses a blank, a short and a reused value', async () => {
+    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
+    try {
+      const value = 'conformance/plant/1767225600000';
+      const sentinel = await h.sentinels.plant('notification-body', value);
+      expect(sentinel.value, 'plant() did not hand back the value it was asked to plant').toBe(value);
+      expect(sentinel.id.length, 'the sentinel carries no id, so two plantings are indistinguishable').toBeGreaterThan(0);
+
+      // The refusals are the guard's judgement, reached through the implementation rather than
+      // called directly: a plant() that computed sentinelValueProblem and ignored it passes every
+      // test in the block above and fails all three of these.
+      await expect(h.sentinels.plant('notification-body', 'short')).rejects.toThrow(/characters/);
+      await expect(h.sentinels.plant('notification-body', '   ')).rejects.toThrow(/non-empty/);
+      await expect(h.sentinels.plant('notification-body', value)).rejects.toThrow(/planted before/);
+    } finally {
+      await h.teardown();
+    }
+  });
+
+  it('finds a planted sentinel where it landed, reports absence from a scope it really read, and refuses a scope nothing registered', async 
() => {
+    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
+    try {
+      const world = (await h.fixtures.world('sentinel-scan')) as World;
+      const sut = h.sut.notifications as NotificationsSut;
+
+      const carried = await h.sentinels.plant('notification-body', 'conformance/carried/1767225600001');
+      const neverFired = await h.sentinels.plant('notification-body', 'conformance/absent/1767225600002');
+
+      // ABSENCE, from a scope that is real and was searched. This is the assertion the whole design
+      // of scan() turns on: before it can mean anything, "not there" has to be distinguishable from
+      // "did not look", and the refusal at the end of this test is what makes it so.
+      expect(
+        await h.sentinels.scan(SENTINEL_SCOPE),
+        'a scope holding nothing did not come back empty',
+      ).toEqual([]);
+
+      await world.fire('blocker.raised', { sentinel: carried.value });
+      await sut.drainDeliveries();
+
+      expect(
+        (await h.sentinels.scan(SENTINEL_SCOPE)).map((found) => found.value),
+        'the sentinel that was carried into a delivery body was not found by the scan',
+      ).toEqual([carried.value]);
+      expect(
+        (await h.sentinels.scan(SENTINEL_SCOPE)).map((found) => found.id),
+        'a sentinel nothing carried was reported present — the scan is matching on something other than the value',
+      ).not.toContain(neverFired.id);
+
+      const refusal = await h.sentinels.scan('notifications.nowhere').then(
+        () => null,
+        (err: Error) => err.message,
+      );
+      expect(
+        refusal,
+        'scanning a scope the adapter never registered returned instead of refusing, so "absent" and "never looked" are the same answer 
again',
+      ).toContain('no sentinel scope named');
+      expect(refusal, 'the refusal does not say which scopes DO exist, so a typo is hard to see').toContain(SENTINEL_SCOPE);
+    } finally {
+      await h.teardown();
+    }
+  });
+
+  it('refuses a fault point the product does not expose, and a kind the point does not implement', async () => {
+    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
+    try {
+      expect(await h.faults.points(), 'the fixture stopped exposing the point AT-016.09 arms').toEqual([FAULT_POINT]);
+
+      const refusal = await h.faults.at('notifications.typo', 'crash').then(
+        () => null,
+        (err: Error) => err.message,
+      );
+      expect(
+        refusal,
+        'arming a point nothing exposes was a no-op, so the atomicity oracle would read "both committed" as proof while no fault was ever 
injected',
+      ).toContain('exposes no fault point');
+      expect(refusal, 'the refusal does not name the points that DO exist').toContain(FAULT_POINT);
+
+      // The kind is part of the arming. A point that accepted a kind it does not implement would
+      // arm nothing, still report a trigger when execution passed it, and read as fault-injected.
+      await expect(h.faults.at(FAULT_POINT, 'lose_ack')).rejects.toThrow(/implements no/);
+    } finally {
+      await h.teardown();
+    }
+  });
+
+  it('counts reaching the armed point and never counts arming it, and refuses to clear a fault that never fired', async () => {
+    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
+    try {
+      const world = (await h.fixtures.world('fault-count')) as World;
+
+      const neverReached = await h.faults.at(FAULT_POINT, 'crash');
+      expect(neverReached.point, 'the handle reports a point other than the one it was armed at').toBe(FAULT_POINT);
+      expect(
+        await neverReached.triggerCount(),
+        'arming was counted as firing — every atomicity test in every future suite would then pass on a fault that never happened',
+      ).toBe(0);
+      await expect(
+        neverReached.clear(),
+        'a fault that was armed and never reached was cleared without complaint',
+      ).rejects.toThrow(/never fired/);
+
+      const reached = await h.faults.at(FAULT_POINT, 'crash');
+      await expect(world.fire('payment.succeeded'), 'the induced crash did not surface at all').rejects.toThrow(
+        /induced fault/,
+      );
+      expect(
+        await reached.triggerCount(),
+        'execution reached the armed point and the handle did not count it',
+      ).toBe(1);
+      await reached.clear();
+    } finally {
+      await h.teardown();
+    }
+  });
+
+  it('changes the delivery process identity on restart, and refuses a restart that changed nothing', async () => {
+    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
+    try {
+      const before = await h.faults.processEpoch();
+      expect(before.trim().length, 'the delivery process has no identity, so no restart can be observed').toBeGreaterThan(0);
+      await h.faults.processRestart();
+      expect(
+        await h.faults.processEpoch(),
+        'processRestart() left the identity unchanged — every "survives a restart" assertion above it would be about a process that never 
stopped',
+      ).not.toBe(before);
+    } finally {
+      await h.teardown();
+    }
+
+    // A STUB, and only because the conforming fixture cannot produce this condition: its restart
+    // always changes the epoch. What is under test is the harness's routing to processEpochProblem,
+    // so the seam that lies is the fixture's half, deliberately.
+    const restartsNothing = createFaults({
+      points: () => [],
+      arm: () => {
+        throw new Error('this stub exposes no points, so nothing can arm one');
+      },
+      processEpoch: () => 'delivery-process-1',
+      processRestart: () => undefined,
+    });
+    await expect(
+      restartsNothing.processRestart(),
+      'a restart that left the process identity exactly as it was returned successfully',
+    ).rejects.toThrow(/restarted nothing/);
+  });
+
+  it('degrades an adapter that exposes neither seam to a loud refusal, never to a no-op', async () => {
+    // The seams are OPTIONAL on the adapter because the runner's black-box trees plant disposable
+    // adapters with three members and no more. Optional must not become silent: absence has to be
+    // refused at USE, and the same guards write those refusals.
+    const noFaults = createFaults();
+    expect(await noFaults.points()).toEqual([]);
+    await expect(noFaults.at(FAULT_POINT, 'crash')).rejects.toThrow(/Exposed points: \(none\)/);
+    await expect(noFaults.processRestart()).rejects.toThrow(/empty epoch/);
+
+    // Planting still works with no adapter at all — it is the harness's own act — but a scan has
+    // nothing it could honestly have read, so every scope is refused.
+    const noScopes = createSentinels();
+    const sentinel = await noScopes.plant
('notification-body', 'conformance/no-seam/1767225600003');
+    expect(sentinel.value).toBe('conformance/no-seam/1767225600003');
+    await expect(noScopes.scan(SENTINEL_SCOPE)).rejects.toThrow(/Exposed scopes: \(none\)/);
+  });
+});
+
 describe('the H2 fixture and clock conformance wall', () => {
   it('refuses a capture producer that never opens and freezes nested evidence', () => {
     expect(captureProducerProblem(0, 0)).toContain('without open');
diff --git a/tests/at/harness/faults.ts b/tests/at/harness/faults.ts
new file mode 100644
index 0000000..805ca9f
--- /dev/null
+++ b/tests/at/harness/faults.ts
@@ -0,0 +1,87 @@
+/**
+ * H3 forced failures — arm a named point in the product, and restart the delivery process.
+ *
+ * THE COUNT IS THE WHOLE THING. `FaultHandle.triggerCount()` reports how many times execution
+ * actually REACHED the armed point, never how many times a test armed it. A handle that counted
+ * arming as firing would make every atomicity test in thirty suites pass on nothing at all, with no
+ * suite showing a symptom — which is why the counter is owned by the ADAPTER, at the point itself,
+ * and this module only reads it. There is nowhere here for a count to be invented.
+ *
+ * The four judgements — is this point real, did the fault fire, did the restart restart anything —
+ * live in `guards.ts` and are routed to, never re-derived here.
+ */
+
+import type { FaultHandle, Faults } from './contracts.ts';
+import { faultFiredProblem, faultPointProblem, processEpochProblem } from './guards.ts';
+
+/** The fault kinds the shared contract admits, named once so an adapter seam can spell them. */
+export type FaultKind = 'crash' | 'reject' | 'lose_ack';
+
+/**
+ * ONE LIVE ARMING, produced by the adapter because only the adapter can know when execution reached
+ * the point. `disarm()` is separate from the contract's `clear()`: clearing also passes judgement on
+ * whether the fault fired, and that judgement is this module's, not the adapter's.
+ */
+export type ArmedFault = {
+  /** times execution REACHED the point while this arming was live — never times it was armed */
+  triggerCount(): number;
+  disarm(): void;
+};
+
+/**
+ * What a fixture adapter exposes so faults can be induced in it. OPTIONAL on the adapter — the
+ * runner's black-box trees plant two-method adapters — and absent means `at()` refuses in the
+ * guard's own words ("Exposed points: (none)") and `processRestart()` refuses on an empty epoch.
+ */
+export type AdapterFaultSeam = {
+  /** the fault points this adapter really honours; arming anything else must not be a no-op */
+  points(): readonly string[];
+  arm(point: string, kind: FaultKind): ArmedFault;
+  /** identity of the delivery process; MUST change across processRestart() */
+  processEpoch(): string;
+  processRestart(): void | Promise<void>;
+};
+
+export function createFaults(seam?: AdapterFaultSeam): Faults {
+  const exposed = (): string[] => (seam ? [...seam.points()] : []);
+  const epoch = (): string => (seam ? seam.processEpoch() : '');
+
+  return {
+    points: async () => exposed(),
+
+    at: async (point, kind) => {
+      if (seam === undefined) {
+        // No seam exposes no points, and the same guard writes the refusal — an adapter that
+        // supplies nothing degrades to a loud "Exposed points: (none)", never to a silent no-op.
+        throw new Error(`${faultPointProblem(point, [])}`);
+      }
+      const problem = faultPointProblem(point, exposed());
+      if (problem !== null) throw new Error(problem);
+
+      const armed = seam.arm(point, kind);
+      const handle: FaultHandle = {
+        point,
+        triggerCount: async () => armed.triggerCount(),
+        clear: async () => {
+          const count = armed.triggerCount();
+          // Disarm FIRST, then judge: the arming must not survive a refusal into the next id, and
+          // what is being refused is the conclusion the test is about to draw, not the cleanup.
+          armed.disarm();
+          const fired = faultFiredProblem(point, count);
+     
     if (fired !== null) throw new Error(fired);
+        },
+      };
+      return handle;
+    },
+
+    processRestart: async () => {
+      const before = epoch();
+      await seam?.processRestart();
+      const after = epoch();
+      const problem = processEpochProblem(before, after);
+      if (problem !== null) throw new Error(problem);
+    },
+
+    processEpoch: async () => epoch(),
+  };
+}
diff --git a/tests/at/harness/index.ts b/tests/at/harness/index.ts
index 2797359..e6d7d66 100644
--- a/tests/at/harness/index.ts
+++ b/tests/at/harness/index.ts
@@ -5,13 +5,24 @@ import { pendingCapability, realCapability, standInCapability, stubbedCapability
 import { REPO_ROOT } from './check.ts';
 import { ControlledClock } from './clock.ts';
 import { createConfigRegistry, type ConfigRegistry } from './config.ts';
-import type { AtHarness, Faults, Sentinels, StaticScan, Vendors } from './contracts.ts';
+import type { AtHarness, StaticScan, Vendors } from './contracts.ts';
+import { createFaults, type AdapterFaultSeam } from './faults.ts';
 import { createFixtureSeed, FixtureWorldStore } from './fixtures.ts';
+import { createSentinels, type AdapterSentinelSeam } from './sentinels.ts';
 import type { ConfigOverrides, Tier } from './registry.ts';
 
 interface FixtureAdapter {
   fixtures: { world(name: string): Promise<{ teardown(): Promise<void> }> };
   sut: Record<string, unknown>;
+  /**
+   * OPTIONAL, and refused at use rather than ignored. The runner's own black-box trees write
+   * disposable adapters that export `sut`, `fixtures` and `teardown` and nothing else, so a
+   * required member here would break them at run time. Absence is not permission to no-op: an
+   * adapter that offers no fault seam exposes no fault points, so `faults.at()` refuses through
+   * `faultPointProblem` in the guard's own words, and a scan of any scope is refused the same way.
+   */
+  faults?: AdapterFaultSeam;
+  sentinels?: AdapterSentinelSeam;
   teardown(): Promise<void>;
 }
 
@@ -103,10 +114,19 @@ export async function createHarness(opts: {
   const config = realCapability('config.registry', createConfigRegistry(opts.configOverrides));
   const adapter = await loadAdapter(opts.requirement, clock.value, worlds, config.value);
   const fixtures = standInCapability('fixtures.worlds', adapter.fixtures);
+  // REAL, not stand-ins, for the same reason `config.registry` is. `stubbedCapabilities()` reports
+  // what the HARNESS substituted, and nothing about H3 is substituted here — the marker store and
+  // the fault router below are the article. What is a substitute in a loop-tier run is the product,
+  // and `sut.notifications` already declares that; declaring H3 a stand-in as well would count the
+  // same substitution twice and blame the wrong layer for it. It would also cost something real:
+  // `registry.ts` refuses ANY stubbed capability above the loop tier, so the label would bar this
+  // identical machinery from ever running at integration tier — the tier that is the closing gate.
+  const sentinels = realCapability('sentinels.planted', createSentinels(adapter.sentinels));
+  const faults = realCapability('faults.injection', createFaults(adapter.faults));
   const sutCapabilities: Capability<unknown>[] = Object.entries(adapter.sut).map(([name, value]) =>
     standInCapability(`sut.${name}`, value),
   );
-  const constructed: Capability<unknown>[] = [clock, fixtures, config, ...sutCapabilities];
+  const constructed: Capability<unknown>[] = [clock, fixtures, config, sentinels, faults, ...sutCapabilities];
 
   let tornDown = false;
   return {
@@ -115,9 +135,14 @@ export async function createHarness(opts: {
     clock: clock.value,
     fixtures: fixtures.value,
     sut: adapter.sut,
-    sentinels: pendingCapability<Sentinels>('H3 sentinels'),
-    faults: pendingCapability<Faults>('H3 fault injection and process restart'),
-    static: pendingCapability<StaticScan>('H3 static provider scan', 'H3 sentinels', 'H5 email provider simulator'),
+    sentinels: sentinels.value,
+    faults: faults.value,
+    // 
'H3 sentinels' is GONE from this list, in the same change that made planting work. The seam
+    // names three capabilities so its first throw reports the whole missing set at once; the moment
+    // one of them lands, keeping its name here is a declared fact that has drifted from a real one.
+    // `AT-016.01` stays red — `providerClientImporters()` is what throws — but the reason it is red
+    // changed, and `tests/at/expected/req-016.json` states the same two names for the same reason.
+    static: pendingCapability<StaticScan>('H3 static provider scan', 'H5 email provider simulator'),
     vendors: pendingCapability<Vendors>('H5 email provider simulator'),
     config: config.value,
     teardown: async () => {
diff --git a/tests/at/harness/sentinels.ts b/tests/at/harness/sentinels.ts
new file mode 100644
index 0000000..0f6d522
--- /dev/null
+++ b/tests/at/harness/sentinels.ts
@@ -0,0 +1,62 @@
+/**
+ * H3 planted markers — a value minted by the harness, carried by the product, found again by a scan.
+ *
+ * The judgement about whether a value is EVIDENCE at all is not made here: `sentinelValueProblem`
+ * in `guards.ts` owns it, and `plant()` routes through it rather than re-deriving "long enough and
+ * never reused". Two copies of that rule is how the two drift apart, and a sentinel rule that has
+ * drifted green-lights every suite at once.
+ *
+ * THE SCAN'S WHOLE VALUE IS THAT IT CAN SAY "NOT THERE" WITHOUT MEANING "DID NOT LOOK". An empty
+ * array from a store nobody read is indistinguishable from an empty array from a store that was
+ * genuinely searched — and the first is worthless while the second is the absence half of
+ * AT-016.01. So a scope the adapter never registered is a REFUSAL, never `[]`; after that, `[]`
+ * means one thing only.
+ */
+
+import type { Sentinel, Sentinels } from './contracts.ts';
+import { sentinelValueProblem } from './guards.ts';
+
+/**
+ * What a fixture adapter exposes so its stores can be scanned. OPTIONAL on the adapter — the
+ * runner's black-box trees plant two-method adapters — and absent means every scan is refused,
+ * which is the loud degradation, not a quiet one.
+ */
+export type AdapterSentinelSeam = {
+  /** the named stores this adapter can be searched. `scan()` refuses every other name. */
+  scopes(): readonly string[];
+  /** every searchable body currently held in that scope */
+  read(scope: string): readonly string[];
+};
+
+export function createSentinels(seam?: AdapterSentinelSeam): Sentinels {
+  const planted: Sentinel[] = [];
+  let nextId = 1;
+
+  return {
+    plant: async (kind, value) => {
+      const problem = sentinelValueProblem(
+        value,
+        planted.map((sentinel) => sentinel.value),
+      );
+      if (problem !== null) throw new Error(`refusing to plant a ${kind} sentinel: ${problem}`);
+      const sentinel: Sentinel = { id: `sentinel-${nextId++}-${kind}`, value };
+      planted.push(sentinel);
+      return sentinel;
+    },
+
+    scan: async (scope) => {
+      const scopes = seam ? [...seam.scopes()] : [];
+      if (!scopes.includes(scope)) {
+        throw new Error(
+          `the product exposes no sentinel scope named ${JSON.stringify(scope)} — scanning it would ` +
+            `report every sentinel absent from a store nothing ever read. Exposed scopes: ` +
+            `${scopes.length ? [...scopes].sort().join(', ') : '(none)'}`,
+        );
+      }
+      // `seam` is present: `scopes` is non-empty only when it is, and an empty `scopes` refuses
+      // every name above.
+      const bodies = seam ? [...seam.read(scope)] : [];
+      return planted.filter((sentinel) => bodies.some((body) => body.includes(sentinel.value)));
+    },
+  };
+}
diff --git a/tests/at/harness/suite-adapters.ts b/tests/at/harness/suite-adapters.ts
index 967cca4..b86d3c6 100644
--- a/tests/at/harness/suite-adapters.ts
+++ b/tests/at/harness/suite-adapters.ts
@@ -46,7 +46,9 @@
  * quietly disagrees with its adapter has not, and only the second kind of failure is invisible.
  */
 
+import type { AdapterFaultSeam } 
from './faults.ts';
 import type { WorldLike } from './registry.ts';
+import type { AdapterSentinelSeam } from './sentinels.ts';
 
 /**
  * The minimum any fixture adapter owes the harness, expressed so a malformed one fails AT ITS MAP
@@ -60,6 +62,15 @@ import type { WorldLike } from './registry.ts';
 type AdapterShape = {
   sut: Record<string, unknown>;
   fixtures: { world(name: string): Promise<WorldLike> };
+  /**
+   * H3's two seams, OPTIONAL here for the same reason they are optional in `index.ts`: the runner's
+   * black-box trees register disposable adapters that export three members and no more, and a
+   * required member would break them at run time rather than at their map entry. Optional is not
+   * silent — an adapter that supplies neither exposes no fault points and no sentinel scopes, so
+   * arming a fault or scanning a scope is a refusal in `guards.ts`'s own words.
+   */
+  faults?: AdapterFaultSeam;
+  sentinels?: AdapterSentinelSeam;
   teardown(): Promise<void>;
 };
 
diff --git a/tests/at/suites/req-016/_fixture.ts b/tests/at/suites/req-016/_fixture.ts
index 41331f4..e6a7c42 100644
--- a/tests/at/suites/req-016/_fixture.ts
+++ b/tests/at/suites/req-016/_fixture.ts
@@ -19,7 +19,9 @@
  */
 
 import type { ControlledClock } from '../../harness/clock.ts';
+import type { AdapterFaultSeam, ArmedFault, FaultKind } from '../../harness/faults.ts';
 import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
+import type { AdapterSentinelSeam } from '../../harness/sentinels.ts';
 import type {
   ConfigRegistry,
   Delivery,
@@ -51,6 +53,19 @@ interface AdapterOptions {
   config: ConfigRegistry;
 }
 
+/**
+ * THE FAULT POINT, and its name is a claim about where it sits.
+ *
+ * `emitKnown` below commits the state transition, reaches this point, and only then writes the
+ * notification event — in that order, because the point's name says so. The order used to be the
+ * other way round, and renaming the point to fit the code would have been exactly the
+ * declared-versus-real drift this way of work exists to delete, so the writes moved instead.
+ */
+const FAULT_POINT = 'notifications.between_transition_and_event_write';
+
+/** The one store a sentinel scan can search here: the copy actually delivered to a recipient. */
+const SENTINEL_SCOPE = 'notifications.delivery_bodies';
+
 /** The at-config keys the thread-comment anti-spam guard is configured by. */
 const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
 const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';
@@ -176,6 +191,63 @@ export function createFixtureAdapter({ clock, worlds, config }: AdapterOptions)
   let commentsInWindow = 0;
   let coalescedInWindow = false;
 
+  /*
+   * THE DELIVERY PROCESS'S IDENTITY, and the armed faults it can be interrupted by.
+   *
+   * There was no process here to restart: `drainDeliveries` is a synchronous sweep with no
+   * lifecycle, and `state.nextId` counts events, not processes. So an identity is introduced,
+   * `processRestart()` changes it, and `processEpochProblem` in the harness refuses a restart that
+   * left it unchanged — otherwise "survives a restart" is a claim about a process that never
+   * stopped. Durable state deliberately SURVIVES the change: AT-016.07 asserts, after the restart,
+   * that exactly one logical event and one delivery per recipient-channel pair remain, and a
+   * restart that cleared them would fail that, correctly.
+   */
+  let epochSeq = 1;
+  let processEpoch = `delivery-process-${epochSeq}`;
+  const armedFaults = new Map<string, { count: number }>();
+
+  /**
+   * Execution has REACHED a fault point. THE COUNT IS INCREMENTED HERE AND NOWHERE ELSE — arming
+   * happens in `arm()` below and adds nothing to it, which is the difference between an atomicity
+   * test that proves something and one that passes on a fault that never happened.
+   */
+  const reachFaultPoint = (point: string): void => {
+    const armed = armedFaults.get(point);
+    if (!armed) return;
+    armed.count += 1;
+    throw new Error(`induced fault: crash at ${point}`);
+  };
+
+  const faults: AdapterFaultSeam = {
+    points: () => [FAULT_POINT],
+    arm: (point: string, kind: FaultKind): ArmedFault => {
+      // A point that silently accepted a kind it does not implement would arm nothing while
+      // reporting a trigger, and the atomicity oracle would read the result as proof.
+      if (kind !== 'crash') {
+        throw new Error(
+          `fault point ${JSON.stringify(point)} implements no ${JSON.stringify(kind)} fault — it implements: crash`,
+        );
+      }
+      const armed = { count: 0 };
+      armedFaults.set(point, armed);
+      return {
+        triggerCount: () => armed.count,
+        disarm: () => {
+          if (armedFaults.get(point) === armed) armedFaults.delete(point);
+        },
+      };
+    },
+    processEpoch: () => processEpoch,
+    processRestart: () => {
+      processEpoch = `delivery-process-${++epochSeq}`;
+    },
+  };
+
+  const sentinels: AdapterSentinelSeam = {
+    scopes: () => [SENTINEL_SCOPE],
+    read: () => state.deliveries.map((delivery) => delivery.body),
+  };
+
   const emitKnown = async (
     world: NotificationFixtureWorld,
     event: string,
@@ -191,6 +263,23 @@ export function createFixtureAdapter({ clock, worlds, config }: AdapterOptions)
       recipientId: world.actors[role],
       channels: [...channels],
     }));
+    // (1) THE TRANSITION COMMITS FIRST, (2) the fault point, (3) the event write and everything
+    // that belongs to it. That order is what the point's name asserts.
+    //
+    // ONE ROLLBACK UNIT: a crash at the point puts the transition back the way it was, so neither
+    // side is committed. Restoring the PREVIOUS value rather than deleting the key matters — an
+    // earlier firing of the same event legitimately left one behind, and deleting it would report
+    // "the transition never happened" about a transition that did.
+    const transitionBefore = state.transitions.get(event);
+    state.transitions.set(event, true);
+    try {
+      reachFaultPoint(FAULT_POINT);
+    } catch (fault) {
+      if (transitionBefore === undefined) state.transitions.delete(event);
+      else state.transitions.set(event, transitionBefore);
+      throw fault;
+    }
+
     state.events.push({
       id: eventId,
       type: event,
@@ -216,7 +305,6 @@ export function createFixtureAdapter({ clock, worlds, config }: AdapterOptions)
     if (row.opsItem) {
       state.opsItems.push({ id: `ops-${eventId}`, kind: row.event, linkedEventId: eventId });
     }
-    state.transitions.set(event, true);
     return { eventId };
   };
 
@@ -255,6 +343,8 @@ export function createFixtureAdapter({ clock, worlds, config }: AdapterOptions)
 
   return {
     sut: { notifications: sut },
+    faults,
+    sentinels,
     fixtures: {
       world: async (name: string) => {
         const base = await worlds.world(name);
@@ -298,6 +388,7 @@ export function createFixtureAdapter({ clock, worlds, config }: AdapterOptions)
       state.deliveries.length = 0;
       state.opsItems.length = 0;
       state.transitions.clear();
+      armedFaults.clear();
       commentWindowStart = null;
       commentsInWindow = 0;
       coalescedInWindow = false;
diff --git a/tests/at/suites/req-016/c-reliability-guard.test.ts b/tests/at/suites/req-016/c-reliability-guard.test.ts
index 71b97ab..3896a63 100644
--- a/tests/at/suites/req-016/c-reliability-guard.test.ts
+++ b/tests/at/suites/req-016/c-reliability-guard.test.ts
@@ -74,15 +74,32 @@ describe('AT-REQ-016 C — critical-event reliability guard', () => {
         const transitionCommitted = await w.transitionCommitted(row.event);
         const eventWritten = (await sut.events({ type: row.event })).length > 0;
 
-        if (transitionCommitted !== eventWritten) {
+        // NEITHER SIDE COMMITTED, not merely the two agreeing with each other.
+        //
+        // This oracle used to read `transitionCommitted !== eventWritten`, and that rejected only
+        // UNEQUAL outcomes — so a fault firing after both writes left both committed, compared
+        // equal, and passed, having proved no atomicity whatsoever. The control run above does not
+        // close it either: that also ends with both committed. Turning this test green against the
+        // old oracle would have been a green bought with nothing.
+        //
+        // Asserting both false rejects a strict superset of what "unequal" rejected, so it cannot
+        // pass anything the old form failed. Its falsification is on file: with the fault point
+        // moved after both writes, the old form passes and this one fails
+        // (`loop/items/AI4DEV-19/proof-oracle.txt`).
+        if (transitionCommitted || eventWritten) {
+          const committed = [
+            ...(transitionCommitted ? ['the transition'] : []),
+            ...(eventWritten ? ['the notification event'] : []),
+          ];
           problems.push(
             `${row.event}: transition=${transitionCommitted} notificationEvent=${eventWritten} — ` +
-              `the fault committed one without the other`,
+              `a crash at ${FAULT_POINT} committed ${committed.join(' and ')}; the two must roll back ` +
+              `as one unit, leaving neither`,
           );
         }
       }
 
-      expect(problems, `guarded rows where transition-without-event (or event-without-transition) was reachable`).toEqual([]);
+      expect(problems, `guarded rows where a crash between the transition and the event write left either side committed`).toEqual([]);
     },
   );
 
This is a substantial adversarial review. I should read the actual files and context docs. Let me consider delegating to a subagent — but I've 
already read the diff, and the review needs close reading of several files: faults.ts, sentinels.ts, guards.ts, _fixture.ts, 
c-reliability-guard.test.ts, conformance.selftest.ts, contracts.ts, req-016.json, design.md, gate0-rulings.md, proofs. This is a lot of 
context. Delegation to a coder/explore subagent makes sense, but the task is a review that demands precision. I could do it myself — the diff 
is manageable. Let me read the key files.

  Key files to read:
  - tests/at/harness/faults.ts (already in diff, but full file is the diff — new file, 87 lines, fully shown)
  - tests/at/harness/sentinels.ts (fully shown, 62 lines)
  - tests/at/harness/guards.ts (NOT in diff — need to read: sentinelValueProblem, faultPointProblem, faultFiredProblem, processEpochProblem)
  - tests/at/harness/contracts.ts (FaultHandle, Faults, Sentinel, Sentinels types)
  - tests/at/suites/req-016/_fixture.ts (full file, to check emitKnown rollback and state.nextId)
  - tests/at/suites/req-016/c-reliability-guard.test.ts (full, to check AT-016.09 loop, continue, control run)
  - tests/at/harness/conformance.selftest.ts (the new tests — mostly shown in diff)
  - tests/at/expected/req-016.json (full)
  - loop/items/AI4DEV-19/design.md, gate0-rulings.md, proof files

  Let me think about what I can already analyze from the diff:

  **Faults.ts analysis:**

  1. `at()` — arms via seam.arm, returns handle. Note: arming a second fault at the same point REPLACES the first in the map 
(`armedFaults.set(point, armed)`). The first handle's `disarm()` checks identity (`armedFaults.get(point) === armed`) so it won't disarm the 
second — ok. But the first handle's `triggerCount()` still reads its own `armed.count`, which will stay 0 since `reachFaultPoint` looks up the 
map and finds the newer armed object. Isolation issue: two handles armed at the same point — the first handle's count freezes. Also in 
conformance test "counts reaching the armed point": they arm `neverReached`, never clear successfully (clear throws but disarms first — good), 
then arm `reached`. Since clear disarms first, map is clean. OK.

  2. `clear()` disarms first then judges — good against leak.

  3. Isolation: `armedFaults.clear()` in teardown — but what about a test that throws before clear()? The teardown clears armedFaults. But 
worlds: AT-016.09 opens 22 worlds. Are worlds torn down between? Need to check _fixture world teardown and whether armedFaults is per-adapter 
(module-level within createFixtureAdapter) — shared across worlds of the same harness instance. If a test arms a fault and throws before 
clear, and the harness is reused across tests... need to check how tests create harness instances.

  4. `processRestart()` in faults.ts: captures `before = epoch()`, awaits seam.processRestart, `after = epoch()`, judges. If seam undefined: 
epoch() returns '' before and after — processEpochProblem('', '') — what does the guard say? Conformance test expects /empty epoch/. Need 
guards.ts.

  5. `sentinels.scan`: `planted` array persists for harness lifetime; teardown of worlds doesn't clear planted. Planted sentinels persist 
across worlds — is that isolation leak? Planted values are in harness, scope reads from adapter state.deliveries which is cleared on world 
teardown. A sentinel planted in world A, found in world A deliveries; world B teardown clears deliveries so scan in world B won't find it — 
unless value collision. Fine-ish. But plant reuse-refusal: value uniqueness enforced across the whole harness lifetime — a later world 
planting the same value is refused. Fine.

  6. **Bigger issue in sentinels.scan**: `seam ? [...seam.read(scope)] : []` — the `seam ?` branch is dead code per the comment, fine. But the 
absence claim: read returns delivery bodies. Fine.

  7. **_fixture.ts emitKnown**: Check `state.nextId`. Where is eventId computed? In the diff, eventId was presumably computed before the shown 
section from state.nextId, and nextId incremented somewhere. Need to read the full file. If `state.nextId` is incremented before the fault 
point and not rolled back, then after a crash, nextId stays advanced — subsequent events skip an id. Does anything assert on ids? The gate 
prompt asks: "Is `state.nextId` left advanced?" Need to read the file.

  8. Rollback covers only transitions. What about deliveries, ops items, events — those are pushed after the fault point, so a crash at the 
fault point means they were never pushed. OK — crash is between transition and event write, so event side never happens. But the guard cap 
counting (commentsInWindow) — where does that happen? If before the fault point and not rolled back... need full file.

  9. Also: `reachFaultPoint` is only called in emitKnown. What about emit paths for non-critical events? Fine.

  10. **AT-016.09 oracle**: need the full test file to check whether a row could no-op, whether fault fires before transition, `continue` 
skipping assertion, control run.

  11. **req-016.json declaration**: AT-016.01 capabilities now ["H3 static provider scan", "H5 email provider simulator"]. The seam in 
index.ts: `static: pendingCapability<StaticScan>('H3 static provider scan', 'H5 email provider simulator')`. But AT-016.01's seam — what does 
it actually throw first? The comment says `providerClientImporters()` throws. Question 7 asks: "is AT-016.01's capability list now exactly 
what its seam actually throws, in the same order?" Need to check what the seam throws — does it throw with both names, in that order? Also, 
AT-016.01 test calls `h.static.providerClientImporters()` at line 28 and `plant()` at line 50 — sentinels now real, so it gets past plant... 
wait no, it throws at line 28 on h.static. But now sentinels are real — the harness `sentinels` is real. The test's first seam usage throws 
for static. Expected lists capabilities of the throw. Need to read the actual test and pendingCapability implementation.

  12. **conformance test for processRestart with real harness**: processRestart changes epoch always in fixture. But wait — the harness-level 
`faults.processRestart` calls `epoch()` before and after. Fixture's processEpoch is fine.

  13. **Potential issue in faults.ts `at`**: when `seam === undefined`, throws faultPointProblem(point, []) — good. But when seam exists and 
point valid but kind invalid — arm throws from fixture. The guard routing: faultPointProblem(point, exposed()) — called and acted on. 
faultFiredProblem — in clear. processEpochProblem — in processRestart. But what about `sentinelValueProblem` — in plant. All four predicates 
called and acted on. Question 5 asks to verify guards.ts exists with those predicates.

  14. **Sentinels conformance absence test**: scan on scope before any fire returns [] — proves scope read? The scope is registered, read 
returns state.deliveries — empty at that point. The distinction "not there" vs "did not look" rests on scope registration refusal. OK.

  15. **A subtle one in sentinels.plant**: uniqueness check against `planted` values — but two plantings of values where one includes the 
other? scan matches `body.includes(sentinel.value)` — a short sentinel value could substring-match unrelated bodies. Guard requires min length 
(sentinelValueProblem — need to see it). Also planted value 'conformance/carried/...' vs 'conformance/absent/...' distinct. Fine.

  16. **triggerCount after disarm**: In the conformance test, `reached.triggerCount()` is read while still armed — fine. But 
handle.triggerCount after clear: reads armed.count — still works, count preserved. OK.

  17. **Faults.at double-arm same point**: `arm` replaces map entry. If AT-016.09 arms fault per row and a crash happens, then next row arms 
again — previous handle never cleared (test threw? no, fire throws, test catches). Need to read AT-016.09 flow: arm, fire (crash), assert 
rollback, clear. clear() with count>=1 succeeds and disarms. Next row arms fresh. But if a row's fire does NOT throw (bug — fault not 
injected), clear() refuses with "never fired", and the test... does it catch that? If clear throws inside the loop, the whole test errors — is 
that a false green? No, it fails loudly. Good. But wait — clear disarms FIRST then throws, so next row is clean. Good.

  18. **epoch leak**: processEpoch is per-adapter; new harness per test? Conformance creates harness per test. AT-016.09 — one harness, 
restarts process per row? Need to read.

  Now, also **critical check: `emitKnown` — where does `eventId` come from and is `nextId` incremented before the fault point?** From the 
diff, the transition set was moved from after opsItems push to before the try block. The original line `state.transitions.set(event, true)` 
was after everything. Now: transition set, fault point, then event push, deliveries?, ops items. Need the full file to see eventId/nextId and 
delivery creation ordering. Also whether `state.deliveries` are created in emitKnown or in drainDeliveries.

  Also **comment-window counter**: `commentsInWindow` increments — if that happens in emitKnown before the fault and isn't rolled back, a 
crashed event still consumed window budget. Gate asks "is EVERYTHING on the event side rolled back (event, deliveries, ops item)". Transition 
is before the point; event side after. But counters like nextId/commentsInWindow — need the file.

  Let me read the full files now. I'll read in parallel:
  - tests/at/suites/req-016/_fixture.ts (full)
  - tests/at/suites/req-016/c-reliability-guard.test.ts (full)
  - tests/at/harness/guards.ts
  - tests/at/harness/contracts.ts
  - tests/at/expected/req-016.json
  - tests/at/suites/req-016/a-*.test.ts (AT-016.01) — find the file with providerClientImporters

  And context docs: design.md, gate0-rulings.md, proof-red/green/oracle.

  That's a lot; maybe delegate context docs to an explore agent? The prompt says read them for the WHY. I can read design.md and 
gate0-rulings.md myself but they're ~230 and ~136 lines. Proofs: proof-red 215, proof-oracle 92, proof-green 29. Total ~700 lines of docs plus 
~800 lines of code. That's fine to read myself, but heavy. I could delegate the docs skim to a subagent. Actually, given the review demands 
precision on code, I'll read code myself and skim docs selectively. Let me start with the code files.

• I have the diff. Now I'll read the full files the diff touches and the context docs, starting with the code.

• Now let me read the remaining files: contracts.ts (FaultHandle/Faults/Sentinels/Sentinel types), the AT-016.01 test (a-*.test.ts), 
expected/req-016.json full, and the docs (design.md, gate0-rulings.md, proofs). Also check `_bind.ts` (atTest / open) to understand world 
isolation — does `open()` create a fresh world with fresh state? In _fixture, `state` is shared per-adapter across worlds! World teardown — 
what does base teardown do? openedWorlds accumulate; does `open()` per test or per call? In AT-016.09, `open()` is called per row, twice per 
row (control + fault). Does each `open()` reset state? The adapter's `state` is shared across all worlds of one harness. World teardown 
(base.teardown) — need to check fixtures.ts whether teardown clears adapter state. The adapter teardown clears state, but individual world 
teardown only calls base.teardown().

  So: control run opens world 1, fires, drains → state has transition committed and event written for row.event. Then fault run opens world 2 
in the SAME harness (same adapter state!). Wait — does each `open()` create a new harness? Need `_bind.ts` atTest and `open`. If state is 
shared, then in the fault run, `transitionCommitted(row.event)` would read TRUE from the control run's commit! But wait — the rollback: 
`transitionBefore = state.transitions.get(event)` — if the control run already set transitions.set(event, true), then transitionBefore = true, 
and on fault, rollback sets it back to true! Then `transitionCommitted` returns true → problem reported → test fails?? That would make 
AT-016.09 red... unless each `open()` resets state, or unless the test is expected green via a different mechanism.

  Wait, proof-green.txt says it's green. So state must be reset per world. Let me check fixtures.ts / _bind.ts. Actually maybe `open()` calls 
adapter teardown or world teardown clears state. The adapter's world() creates base via worlds.world(name) — FixtureWorldStore. Maybe each 
world gets a fresh state... no, state is in createFixtureAdapter closure, shared. Hmm, but maybe `open()` in _bind.ts tears down and recreates 
the harness per open? Need to read _bind.ts.

  This is exactly the isolation question (#4). Let me read _bind.ts and fixtures.ts.

  Also check: the fault run's fire throws → emitKnown increments `state.nextId++` BEFORE the fault point and never rolls it back. The gate 
prompt asks explicitly. eventId is computed and nextId incremented, then crash → event never pushed but nextId advanced. Consequences: later 
events get skipped ids (event-3 instead of event-2). Does any assertion depend on contiguous ids? AT-016.07 asserts "exactly one logical event 
and one delivery per recipient-channel pair remain" — ids not contiguity. Probably benign but worth noting if any oracle assumes. Actually 
more interesting: ops item id `ops-${eventId}` — fine.

  Also commentWindow counters: not incremented in emitKnown (only in burstComments loop, `commentsInWindow += 1` happens regardless of emit 
success). If a fault were armed during burstComments... AT-016.09 arms only between transition and event write and fires row.event events via 
w.fire, not burst. thread.comment bursts don't arm faults. OK.

  Big isolation question: in AT-016.09, control world and fault world share adapter `state`? The control run commits transition AND event for 
row.event. Then fault run: fire throws, rollback restores transitionBefore — which is `true` from control run (same harness state, if shared). 
Then transitionCommitted → true → problems.push → test RED. But proof-green claims green. So either state is per-world (no), or open() resets. 
Must read _bind.ts.

  Also possible: `open()` tears down previous worlds AND adapter teardown resets state. Let me read _bind.ts and fixtures.ts.

  Also contracts.ts for FaultHandle typing, and expected/req-016.json, and the AT-016.01 test file. And docs. Let me parallelize.Key questions 
remain:

  1. AT-016.01's seam: read a-emitter-and-taxonomy.test.ts to check what AT-016.01 throws and its capability order. Expected declares ["H3 
static provider scan", "H5 email provider simulator"]. But AT-016.01's test — what does it call first? If it calls 
`h.static.providerClientImporters()` first, pendingCapability throws with both names (per index.ts static pending has those two names). Order: 
'H3 static provider scan', 'H5 email provider simulator' — matches. But wait, does AT-016.01 also touch `h.sentinels.plant` before `h.static`? 
The conformance comment says "throws at h.static.providerClientImporters() on line 28 and never reaches plant() on line 50". Need to verify 
the file.

  2. How does atTest/open work — does each open() reset adapter state? Need registry.ts. This is critical for AT-016.09's isolation: control 
world commits transition for row.event; fault world in same harness shares `state` unless per-open reset. Let me check registry.ts open() 
semantics.

• Now the registry (how `open()` isolates worlds) and the AT-016.01 test.

• AT-016.01 throws at `h.static.providerClientImporters()` (line 28) — first seam reached. The `static` pendingCapability throws with 
capabilities in order ('H3 static provider scan', 'H5 email provider simulator'). Expected JSON matches, order matches. Good.

  Now I need the `open()` semantics in registry.ts — the grep got cut. Key: does each `open()` build a fresh harness (line 299 comment says 
"build a fresh 'Given' world (and its own harness)"). So each open() has its own harness and own adapter → own state. So in AT-016.09, the 
control world and fault world are separate harness instances → separate state. Good isolation. Let me confirm: read registry.ts around open() 
implementation. Also check teardown between opens, and how atTest wires teardown after the test.

  Also need to check index.ts pendingCapability and stubbedCapabilities / realCapability to verify capability names thrown and ordering. Also 
the conformance tests reference `capabilities.ts`. And whether `at:verify --expect` compares capabilities lists exactly (order?). Question 7: 
"in the same order" — pendingCapability('H3 static provider scan', 'H5 email provider simulator') matches JSON order.

  Remaining reads:
  - registry.ts open() implementation (lines ~388-600?)
  - index.ts full (pendingCapability, realCapability, loadAdapter)
  - design.md, gate0-rulings.md, proof files
  - conformance.selftest.ts full context? The diff showed the new block; existing parts fine.

  Potential findings so far (draft):

  A. **`state.nextId` advanced and not rolled back** (_fixture.ts:258): `const eventId = event-${state.nextId++}` happens before the fault 
point; a crash leaves nextId advanced with no event written. Consequence: later events have a gap in ids. Does anything assert on id 
contiguity? AT-016.07 asserts counts, not ids. It's a cosmetic gap — but the gate prompt explicitly asks. Is it a false-green vector? Not 
obviously. But it's a divergence from "commit as ONE unit": the id allocation is part of the event side. Minor. Also: does the rolled-back 
transition + advanced nextId cause a later row's assertion to pass/fail wrongly? In AT-016.09, each row's fault world is fresh, control world 
fresh; the fault run's crash advances nextId by 1 but no further fire happens in that world except... nothing. Fine in practice. Report as 
minor.

  B. **The control run's `continue`**: if control fails, problem is pushed and `continue` skips the fault run — but the problem was pushed, so 
the test still fails. Not vacuous. Good. But wait — gate question 3 asks whether a `continue` skips the assertion. It skips the fault 
assertion, but pushes a problem, so the run goes red. OK.

  C. **AT-016.09 fault-world fire: does the fault always fire?** `w.fire(row.event)` with fault armed → emitKnown → reachFaultPoint throws → 
clear() counts 1 → passes. But what if the fire path for some row doesn't go through emitKnown? All fires go through emitKnown. OK.

  D. **fault.clear() in finally**: if fire throws something else before reaching the fault point (e.g., unregistered event), triggerCount=0 → 
clear throws "never fired" → test errors loudly. Good.

  E. **Isolation: `planted` sentinels in harness persist across opens?** Each open() creates a new harness (per comment "and its own harness") 
→ new createSentinels → fresh planted. OK. But if open() reuses one harness per test... need to verify. The comment in registry says "(and its 
own harness)". Verify.

  F. **Sentinels scan substring matching**: `body.includes(sentinel.value)` — planted value could match a body that doesn't genuinely carry it 
if value appears as substring. Values are guarded ≥16 chars and unique. Two planted sentinels where one is substring of another? plant only 
refuses exact duplicates. 'conformance/carried/1767225600001' vs a longer value containing it — not refused. Minor, theoretical.

  G. **conformance test "plants ... refuses ... a reused value"**: expects /planted before/ — guard message says "was planted before". Matches.

  H. **faults.ts `at` when seam undefined**: throws `faultPointProblem(point, [])` — "Exposed points: (none)" matches conformance expectation. 
Good.

  I. **processRestart no-seam**: before='' after='' → processEpochProblem('','') → "empty epoch". Conformance expects /empty epoch/. Good.

  J. **`epoch()` non-trimmed**: fine.

  K. **Double-arming same point replaces the first arming silently** (faults.at → seam.arm → armedFaults.set overwrites). The first handle now 
reads its own frozen armed.count (0 forever since map points to new object) and its clear() will throw "never fired" — loud, not silent. But 
consider a suite that arms twice at the same point and fires once: second handle counts 1, first handle's clear refuses. Loud. OK but worth 
noting? The gate asks about armed-as-triggered. Not an issue.

  L. **`disarm` identity check**: good.

  M. **The critical one — AT-016.09's fault world is fresh via open(), but is the previous world torn down?** openedWorlds per adapter; each 
open has its own adapter, so fine. But does the harness teardown happen after test? registry handles per-test teardown. Need to verify open() 
teardown of intermediate harnesses — 22 opens in one test = 22 harnesses; are they torn down at test end? If not, resources leak but not 
correctness. Check registry.

  N. **`sentinels.scan` filter matches on `body.includes(value)` where bodies come from `state.deliveries`** — the conformance absence test 
scans BEFORE firing, state.deliveries empty → []. Does that prove the scope was "genuinely READ"? The scope is registered and read returns 
empty array — distinguishable from unregistered (refused). The gate asks: "Does the absence test prove the scope was genuinely READ, rather 
than just returning empty?" In the test: scan returns [] when nothing fired, then [carried.value] after firing — the transition from empty to 
non-empty on the same scope proves read reflects store contents. Good.

  O. **conformance test 2: `expect((await scan).map(found => found.id)).not.toContain(neverFired.id)`** — would a no-op scan (returns []) pass 
this? Yes, but the previous assertion `toEqual([carried.value])` would fail against no-op. OK.

  P. **index.ts: sentinels/faults marked `realCapability`** — check what realCapability does vs pendingCapability ordering in 
stubbedCapabilities. Also verify `registry.ts refuses ANY stubbed capability above loop tier` claim: sentinels/faults real means integration 
tier wouldn't refuse... but sut.notifications is standIn, so still refused at integration. The comment says exactly that. OK.

  Q. **AT-016.07**: now green, uses processRestart. Need to check AT-016.07's test to see restart assertion correctness. It's in 
d-taxonomy-evidence.test.ts probably. Let me check where AT-016.07 is. Gate prompt says "restart the delivery process, assert atomicity". Let 
me look at AT-016.07 quickly.

  R. **FaultHandle.triggerCount type mismatch?** contracts.ts FaultHandle.triggerCount(): Promise<number>; faults.ts returns async () => 
armed.triggerCount() — ArmedFault.triggerCount(): number. Fine.

  S. **`Faults.at` kind type in contracts: 'crash' | 'reject' | 'lose_ack'**; FaultKind exported matches. Good.

  T. **A subtle issue in `faults.ts` at(): it validates point BEFORE calling seam.arm, but never validates that seam.points() contains the 
point at arm time vs. later.** Trivial.

  U. **BIG ONE — check `reachFaultPoint` counting vs. multi-fire**: triggerCount counts every reach while armed. In AT-016.09, fire throws on 
first reach. Fine.

  V. **`emitKnown` rollback restores transition but the fault throws BEFORE event write — however `payloadFor`/`recipients` computed before; 
no side effects. OK.

  W. **`state.transitions` keyed by event type, not eventId** — transitionCommitted(event) returns boolean per type. Rollback restores 
previous value — correct when same event fired earlier (comment addresses). Good.

  X. **AT-016.09 control world's `continue`**: pushes problem → red. Fine.

  Y. **Question: does `open()` give each open its own harness?** Must verify in registry.ts. If instead one harness per test and worlds share 
adapter state, then AT-016.09 fault run would see control run's committed transition (same state.transitions!) — rollback restores 
transitionBefore=true → assertion fails. But proof-green says green, and declaration says AT-016.09 green. So open must isolate. Verify to be 
sure.

  Z. **expected/req-016.json**: red list AT-016.01 caps ["H3 static provider scan", "H5 email provider simulator"]. AT-016.01 first touches 
h.static → pendingCapability('H3 static provider scan', 'H5 email provider simulator'). Need to check how pendingCapability throws — does the 
thrown error record capabilities in that order, and does at:verify compare ordered? Check capabilities.ts and the verify runner.

  Also check: does anything else in AT-016.01 hit `h.vendors` before `h.static`? No — line 28 is first. Good.

  Also — the harness `teardown` in index.ts: does it call adapter.teardown? Presumably. armedFaults.clear() there handles "test throws before 
clear()". Good.

  Now, a deeper look at fault semantics for FALSE GREEN:

  **faults.ts clear() disarms first, then throws if never fired.** In AT-016.09, `finally { await fault.clear(); }` — if the fire did NOT 
throw (no fault injected because of a bug where reachFaultPoint isn't called), the test continues: transition committed AND event written → 
oracle catches it (both committed → problem). And clear() throws "never fired". Double protection. Good.

  **What if fire succeeds despite fault armed because emitKnown catches?** No.

  **processRestart in AT-016.07**: check the test. In d-taxonomy-evidence or another file? AT-016.07 title "restart the delivery process 
mid-flight". Search.

  Also **conformance selftest processRestart test**: `before` epoch captured, restart, `after` differs. But note — in the REAL fixture, 
processRestart always increments epochSeq, so even a "restart" that did nothing else changes identity. The epoch is a pure counter with no 
coupling to any process state — "restart" restarts nothing except a counter. Is that a false green? The fixture is a stand-in; the epoch 
proves the harness ROUTES the call. At loop tier with a stand-in product, that's the designed meaning. The comment acknowledges there's no 
real process. It's honest within the loop tier. But gate might flag: the epoch changes unconditionally, so processEpochProblem can never fire 
against the conforming fixture — that's why the stub test exists. OK by design.

  **Sentinel scan returns `planted.filter(...)`** — returns Sentinel objects including ones planted but not carried. Right.

  **Sentinel id**: `sentinel-${nextId++}-${kind}` — unique per harness. Fine.

  **A real potential finding — `sentinels.plant` uniqueness scope is per-harness; AT-016.01 uses `Date.now()` in the value.** Fine.

  **Another: in AT-016.01 the sentinel value uses Date.now() — real wall clock, not the controlled clock.** Pre-existing, not in diff.

  Now the docs: read design.md, gate0-rulings.md, proof files to check claims (e.g., proof-oracle.txt demonstrates falsification). Also verify 
the claim in conformance.selftest comment "scan() has no caller anywhere in the tree" — grep scan( usage. AT-016.01 doesn't call scan (uses 
sut.deliveries directly). Interesting: so sentinels.scan has no suite consumer — the comment admits it.

  Also check "AT-016.01 throws at line 28 and never reaches plant() on line 50" — plant is at line 50 indeed. And expected/req-016.json for 
AT-016.01 lists only static+H5 — correct since it throws at static first. But wait: the thrown error from `static` pendingCapability lists TWO 
capabilities: 'H3 static provider scan', 'H5 email provider simulator'. But AT-016.01 ALSO uses h.vendors.email (line 71) — but never reaches 
it. The declared capability list must match what the seam throws, not what the test would need. Gate question 7 asks exactly this. The seam 
throws two names in order — matches JSON.

  Let me now read registry.ts open() implementation and index.ts + capabilities.ts, and check where AT-016.07 lives.

• Now the `open()` implementation in registry.ts, the harness `index.ts`/`capabilities.ts`, and where AT-016.07 lives.

• Confirmed: each `open()` builds its own harness (`openWorld` → `createHarness`) → own adapter → own state. So AT-016.09's control and fault 
runs are isolated. Teardown is tracked per open. Good.

  Now: AT-016.07 — where is it? And capabilities.ts (pendingCapability behavior, how verify matches capabilities list order). And the docs 
(design.md, gate0-rulings.md, proofs). Let me check AT-016.07 location and capabilities.ts.Let me read AT-016.07's test 
(b-delivery-defaults.test.ts lines ~1-80) and the docs (design.md, gate0-rulings.md, proofs). Also I should verify the proof files match 
claims, and run the conformance + req-016 suite to confirm green? The gate asks to review, not necessarily run, but running helps verify 
claims. Running the suite is a good verification. Let me read the remaining files first.Now the proofs and gate0-rulings. And I want to run 
the tests to verify claims. Also read conformance.selftest.ts fully around the new block (already have diff; fine). Also check `_oracles.ts` 
for anything relevant (not needed much).

  Also check expected.ts detailMatches claim — whole-string equality on capability list, order matters? The design says "stale or reordered 
capabilities array fails". The JSON order ["H3 static provider scan", "H5 email provider simulator"] matches index.ts order. Good.

  Let me read the proof files quickly and then run the verification suite.

  Actually, key remaining analysis items before running:

  **Finding candidates so far:**

  1. **`state.nextId` left advanced on fault** (_fixture.ts:258). The gate explicitly asks. Impact: id gaps. Does any oracle depend on nextId 
contiguity? ops id uses eventId. Not asserted anywhere I saw. But it's a state mutation on the event side not rolled back — a partial 
rollback. In AT-016.09 fault world, after crash nothing else fires, so harmless there. In a future suite that fires again after a crash and 
asserts ids, could matter. It's a real, if low-severity, finding: the "ONE unit" claim in the comment is not literally true — eventId 
allocation commits. Severity: low.

  2. **`armedFaults` re-arm silently replaces an existing arming** (faults.ts at() → seam.arm → Map.set overwrites). The displaced handle is 
left with a frozen count of whatever it had (0 if never fired since its object is no longer in the map), and its clear() will refuse ("never 
fired") even if execution reached the point under the NEW arming. Actually wait — subtle: if handle A armed, then handle B armed (same point), 
then execution reaches the point once: reachFaultPoint finds B's object, increments B. A's count stays 0. A.clear() → disarm (identity check: 
map has B, so A's disarm doesn't remove B — good) → faultFiredProblem(point, 0) → throws "never fired" — but execution DID reach the point 
while A was (nominally) armed. Is that a false red, not false green. Loud, direction is safe. But also: should `at()` refuse to arm a point 
that's already armed? The design doesn't mention. Minor.

  3. **Sentinels `planted` never cleared on harness teardown** — per-harness lifetime, fine.

  4. **Sentinel uniqueness check is exact-equality only** — a new value that is a substring of a previously planted one (or vice versa) can 
false-match `body.includes`. E.g. plant 'aaaaaaaaaaaaaaaa' then plant 'aaaaaaaaaaaaaaaa1' — scan would attribute bodies containing the longer 
to both. Guard doesn't check substring overlap. The conformance tests don't cover it. Low severity, but it's a false-positive vector for 
presence attribution. Worth a minor finding.

  5. **AT-016.09: the fault run's fire catch swallows ALL errors** (line 67 `catch {}`). If fire throws for a reason OTHER than the induced 
fault (e.g., a fixture bug "cannot fire unregistered event"), the test proceeds; clear() would then throw "never fired" if the fault point 
wasn't reached — caught loudly. But if the fault point WAS reached and the error came from somewhere after (impossible — reachFaultPoint 
throws itself; nothing between it and the try). Actually reachFaultPoint is the only thing in the try inside emitKnown. So a swallowed error 
with count≥1 can only be the induced fault... wait, what if `payloadFor` throws (before the fault point)? Then count=0, clear() throws loudly. 
OK — the combination is sound.

  6. **AT-016.09's control-run `continue` skips the fault run** — but pushes a problem, so red. Fine. Not a vacuous pass.

  7. **AT-016.09 doesn't assert deliveries/ops items rolled back** — gate question 2 asks "is EVERYTHING on the event side rolled back (event, 
deliveries, ops item) or only some of it?" In emitKnown, deliveries and ops items are written AFTER the fault point, so a crash at the point 
leaves them unwritten — there's nothing to roll back. The rollback only needs the transition. So correct by construction. But the ORACLE only 
asserts transition and event sides. Deliveries/opsItems can't be partial since they're written after the point, atomically after. Fine — 
nothing wrong.

     Wait — but is there anything written BEFORE the fault point besides the transition? eventId allocation (nextId). Covered in finding 1.

  8. **Conformance test for processRestart with real fixture** — the epoch is a pure counter; processRestart never fails to change it, so the 
real-fixture half can never exercise processEpochProblem. Acknowledged by the stub test. OK.

  9. **`faults.ts` `at()` when seam exists but `exposed()` contains the point while `arm` throws for kind** — conformance covers.

  10. **`processEpoch()` public seam returns `epoch()` with no seam → ''** — a suite calling processEpoch with no adapter gets empty string, 
no refusal. Contract says identity; empty string is the loud signal at processRestart. Minor.

  11. **Sentinels conformance absence test**: does it prove the scope was genuinely READ? scan returns [] while state.deliveries is empty; 
then after fire+drain returns [carried.value]. The transition empty→non-empty proves read reflects the store. And unregistered scope refuses. 
So "not there" distinguishable from "did not look". I'd say this holds. But note one weakness: the empty-scan assertion happens BEFORE any 
delivery exists in that world — state.deliveries is empty, so a `read` implementation that always returned [] would pass THIS assertion; the 
later presence assertion catches that. Combined, fine.

  12. **Declaration question 7**: AT-016.01's capability list — expected ["H3 static provider scan", "H5 email provider simulator"]. What does 
the seam actually throw? pendingCapability dedupes: ['H3 static provider scan','H5 email provider simulator'] — order preserved. But WAIT: 
AT-016.01 also uses h.vendors at line 71 and h.sentinels at line 50 — but throws at line 28 first, so the error carries exactly the static 
seam's names. detailMatches compares... need to check expected.ts how capabilities are compared (order?). Design says whole-string equality — 
so order matters and matches. 

      But hmm — AT-016.01's red capabilities: does it need 'H3 sentinels' declared? It no longer throws for sentinels since sentinels are 
real. Right.

  13. **A deeper one — `FaultHandle.clear()` disarms BEFORE judging (faults.ts:64-70).** Comment justifies. But consider AT-016.09's flow: 
`finally { await fault.clear(); }` — if the fault fired, clear succeeds. Good. If fire never threw because the fault genuinely didn't inject 
(hypothetical bug), clear throws "never fired" out of the finally — masking? The fire's absence of throw isn't an error, so clear's throw is 
the failure signal. Loud. Fine.

  14. **`reachFaultPoint` increments count then throws — so `triggerCount` counts reaches. arming doesn't count. clear() on never-fired 
refuses. Conformance proves all three. Question 1: clean.**

  15. **Isolation question 4**: armed fault leak — if a test throws before clear(), harness teardown calls adapter.teardown → 
armedFaults.clear(). And each open() = own harness. Sentinels planted per harness. Process epoch per harness. No cross-world leak within a 
test since each open has its own adapter. The one shared thing: nothing module-level. Clean.

  16. **Question 8: code/comments disagree.** Check claims:
      - conformance.selftest comment: "AT-016.01 throws at h.static.providerClientImporters() on line 28 and never reaches plant() on line 50" 
— verified lines 28 and 50. True.
      - "scan() has no caller anywhere in the tree" — grep confirms only conformance + harness. True.
      - design.md says conformance.selftest.ts:139-158 asserts stand-in ledger ['clock.controlled','fixtures.worlds','sut.notifications'] — 
should verify that selftest still asserts this and that stubbedCapabilities unchanged. Check conformance.selftest lines ~139-158. The diff 
didn't touch it, but let me verify the list exists and that realCapability for sentinels/faults doesn't appear. stubbedCapabilityNames filters 
stand-in only: clock.controlled (stand-in), fixtures.worlds (stand-in), sut.notifications (stand-in). config real, sentinels real, faults 
real. So ledger unchanged. 

  17. **`Faults.at` — the no-seam branch throws `faultPointProblem(point, [])` wrapped in template `${...}` — fine.

  18. **One more possible finding: in `sentinels.scan`, when `seam` is defined but `seam.read(scope)` — the check `scopes.includes(scope)` 
uses the seam's declared scopes; read ignores the scope argument (fixture's `read: () => state.deliveries...` ignores its param). Fine with 
one scope.

  19. **conformance test "counts reaching the armed point..."** — arms neverReached, clear() rejects AND disarms (disarm first). Then arms 
`reached` — if clear had NOT disarmed first, the second arm would silently replace anyway (Map.set). OK.

  20. **What about `h.faults.at` called twice concurrently?** Not a scenario.

  21. **expected/req-016.json green list**: AT-016.07 and AT-016.09 now green — need run to confirm. proof-green.txt presumably shows. Let me 
read proofs and run verify.

  22. **AT-016.09's `MUST_BE_GUARDED` check**: `GUARDED_ROWS.map(r=>r.event)` contains each — fine.

  23. Potential issue: **AT-016.09 fault world: `await sut.drainDeliveries()` after crash** — deliveries array empty for that event; drain 
marks nothing. Harmless.

  24. **The `transitionBefore` restore when earlier same-event firing exists within the SAME world**: comment covers; restore previous value. 
But consider: previous firing committed transition=true; fault firing rolls back to true — correct ("the transition did happen earlier"). But 
the ORACLE in AT-016.09 would then read transitionCommitted=true and fail — but in AT-016.09 each fault world fires the event only once, so 
transitionBefore is undefined → deleted. OK. In a hypothetical suite firing twice in one world with fault on second: transition stays true, 
event absent → oracle (if it asserts neither committed) fails — but arguably correctly, since the transition WAS committed by the first 
firing. That's a suite-authoring nuance, not harness bug.

  25. **Check `_oracles.ts` countPairs — not in diff. Skip.

  26. **conformance.selftest: does the plant-refusal test for short value rely on message /characters/? guard says "at least 16 are needed" — 
message: "sentinel value \"short\" is 5 characters; at least 16 are needed for ..." contains "characters". OK. /non-empty/ matches "must be 
non-empty text". /planted before/ matches "was planted before". Good.

  27. **processRestart no-seam: `epoch()` returns '' and `processEpochProblem('', '')` → 'the delivery process reported an empty epoch...'** 
matches /empty epoch/. Good.

  28. **Question: does anything verify expected/req-016.json matches run exactly?** Run `bun run at:verify req-016 --tier loop --expect` to 
confirm. Also run the conformance selftest. Let me check package.json scripts.

  Also should read proof-red/proof-green/proof-oracle to check they're honest (e.g., proof-oracle shows old oracle passing and new failing). 
And gate0-rulings.md for constraints I should check. Let me read those three proofs + gate0-rulings, then run the suite.

• Now the proofs and gate-0 rulings, then I'll run the verification.

• Now let me run the verification to confirm the declaration matches the run, plus the conformance selftest. Check package.json scripts first. 
Actually just run `bun run at:verify req-016 --tier loop --expect` and the conformance selftest via vitest.

  Also, a few more checks:
  1. The stand-in ledger assertion in conformance.selftest.ts (design tripwire: `['clock.controlled', 'fixtures.worlds', 'sut.notifications']` 
at lines ~139-158). Verify it exists unchanged.
  2. `expected.ts` detailMatches — how capability-pending compared (order sensitivity).

  Let me check those quickly and run the tests.

• Context is complete. Now I'll verify by running the gate and the conformance suite.

• detailMatches uses whole-string equality on the joined names — order matters, and the JSON matches index.ts order. Good.

  Now run the gate and conformance tests to verify claims. Run in background? They may take a while but probably fast. Run at:verify with 
--expect, and the conformance selftest.

$ bun tests/at/harness/runner.ts "req-016" --tier loop --expect
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-3jjcYw/vitest-report.json

at:verify req-016 --tier loop
  AT-016.01    red      CapabilityPending: CAPABILITY PENDING — H3 static provider scan, H5 email provider simulator
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    green    every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads
  AT-016.04    green    sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event
  AT-016.05    green    every critical class goes out by email; the low-tone event is in-app only
  AT-016.06    green    a documented delivery default exists for every taxonomy row
  AT-016.07    green    one logical event per committed event, one delivery per recipient-channel pair, across a restart
  AT-016.08    green    a comment burst delivers the count the pinned anti-spam configuration prescribes, on two different configurations
  AT-016.09    green    every guarded transition writes its notification event atomically under an induced fault
  AT-016.10    green    recipients resolve at event creation: the old holder receives, the new holder is excluded
  AT-016.11    red      CapabilityPending: CAPABILITY PENDING — H5 email provider simulator
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 10 green, 2 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\agent-a622111467e48f14d\tests\at\expected\req-016.json exactly 
(10 declared green, 2 declared red)
• Declaration matching is whole-string, order-sensitive — the JSON matches the seam's order. Now running the gate and conformance tests to verify the claims.


 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a622111467e48f14d/tests/at


 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  16:28:19
   Duration  310ms (transform 138ms, setup 0ms, import 151ms, tests 36ms, environment 0ms)

• Both green. Now finalize the adversarial analysis. Let me also double-check a couple of remaining loose ends:

  1. **`sut.emit()` path with armed fault**: emit() → emitKnown → fault throws → emit rejects with the induced error rather than returning 
`{accepted:false}`. Not a finding per se.

  2. **Sentinel substring-planting**: sentinelValueProblem refuses only exact duplicates. Two planted values where one contains the other → 
scan attributes one body to both sentinels. AT-016.01 uses `${atId}/${p.domain}/${Date.now()}` — distinct. It's a theoretical vector: a suite 
could plant a value that is a prefix of an earlier one and get a false presence. But presence would be genuine substring presence... The scan 
semantics are "body contains value" — a sentinel whose value is a substring of another sentinel's value means a body carrying the longer also 
"carries" the shorter. Is that a false green? The shorter sentinel was never carried by the event, yet scan reports it present. Yes — genuine 
(if unlikely) false-positive vector. Guard could reject values that are substrings/superstrings of already-planted ones. Low severity.

  3. **`nextId` not rolled back** — confirmed at _fixture.ts:258: `const eventId = \`event-${state.nextId++}\`` before the fault point. On 
crash, nextId stays advanced. Partial rollback. The comment claims "ONE ROLLBACK UNIT ... puts the transition back the way it was, so neither 
side is committed" — but the id allocation side effect commits. Consequences today: id gaps only; no oracle reads contiguity. Also AT-016.09's 
fault world fires once, so nothing observes it. But the gate explicitly asks "Is `state.nextId` left advanced?" — yes. Small fix: compute 
`const eventId = \`event-${state.nextId}\`` and increment only after the fault point (or decrement in the catch). Report as low/medium — it's 
a declared-vs-real mismatch between the comment ("ONE ROLLBACK UNIT") and the code, and a future suite firing after a crash would see a 
skipped id; if any future oracle asserts id sequences (e.g. "retries keep the same id / no gaps"), the gap could pass or fail for the wrong 
reason.

  4. **Double-arming same point silently displaces** — faults.ts `at()` doesn't check whether the point is already armed; `armedFaults.set` 
overwrites. The displaced handle keeps its own counter object, which will never increment again (reachFaultPoint looks up the map → new 
object). Displaced handle's `clear()` then throws "never fired" even if the point was reached under the second arming — loud, direction safe. 
But there's a subtler vector: suite arms A, fires (count 1 on A), arms B (displaces A in the map), then B's clear passes only if fired again. 
No false green. Could a displaced arming cause a fault NOT to fire when the suite believes one is armed? Yes: arm A (suite thinks armed), arm 
B at same point accidentally, disarm B via clear — map deleted; A's object is orphaned — point now completely disarmed though handle A is 
still live and the suite may believe A is armed. Then execution passes the point with NO fault thrown and A.triggerCount stays 0; A.clear() 
refuses loudly. Loud again. So no false green, but the displacement semantics deserve a guard: refuse arming a point that is already armed. 
Low.

  5. **`triggerCount()` after `disarm()`** — still returns the last count. Fine.

  6. **Sentinels: `scan` matches against `planted` of THIS harness — a sentinel planted in harness A cannot be found by scanning harness B 
even if the value is in B's store.** But stores are per-adapter/per-harness too, so no cross-contamination. Fine.

  7. **Conformance test 'counts reaching...' — the second arm (`reached`) after the rejected clear: the rejected clear disarmed first (by 
design), so the map is empty; if clear had thrown WITHOUT disarming, the second arm would silently displace (finding 4). Consistent.

  8. **AT-016.09 control world: `continue` skips fault run but pushes problem → red. Fine. Not vacuous.

  9. **The fault run catches ALL throwables from fire** (c-reliability-guard.test.ts:67). Combined with clear()'s never-fired refusal and the 
state oracle, a non-fault error is caught loudly. But one edge: if `w.fire` throws a NON-fault error AFTER the fault point was reached and 
counted... the only thing in the try inside emitKnown is reachFaultPoint itself, which throws its own induced error. Code after the try (event 
push etc.) can't execute when fault fired. So count≥1 ⇒ the caught error is the induced fault. Sound.

  10. **processEpoch exposed publicly with no seam → returns ''** — a suite could compare '' !== '' trivially... processRestart refuses on 
empty epoch. Direct processEpoch() call returns '' silently, but that's just a read. Fine.

  11. **Isolation across AT ids**: armedFaults is per-adapter, per-harness, per-open; teardown also clears. No module-level leak. Sentinels 
`planted` per createSentinels instance. Clean.

  12. **expected/req-016.json ordering** — verified by the --expect run.

  13. **One more: `sentinels.scan` returns `planted.filter(...)` — planted sentinels from EARLIER opens? No, per-harness. But within one 
harness with multiple worlds (AT-016.08 opens 2 worlds in one... no wait, each open is its own harness). Actually open() always creates a new 
harness — so one harness = one world exactly. planted can't leak across worlds. Hmm wait — `open()` creates a harness per call, so the 
adapter's multi-world support is dead code in practice? fixtures.world called once per harness. Fine, not a defect of this diff.

  14. **The conformance test for presence**: `world.fire('blocker.raised', { sentinel: carried.value })` — bodyFor joins payload string values 
into body. The scan finds it. But note: the value also flows through `payloadFor` which puts params into payload... carried values include the 
sentinel. Fine.

  15. **Question 6 audit — would each conformance sentinel test fail against a no-op implementation?**
      - Test 1 (plant/refusals): no-op plant that returns {id:'',value} — fails value echo and id length assertions. If no-op returned the 
value but never refused: refusal assertions fail. Good.
      - Test 2 (scan presence/absence/refusal): no-op scan returning [] fails presence assertion `toEqual([carried.value])`. No-op scan that 
never refuses fails the refusal assertion. Good.
      - Absence-first assertion `toEqual([])` would pass against no-op — but it's paired. Fine.
      
  16. **Test 3 (points/kind refusal)**: no-op faults.points returning [] fails `toEqual([FAULT_POINT])`. Good.

  17. **Test 4 (count/clear)**: no-op at() returning a handle with triggerCount 0: the first assertion expects 0 — passes; clear refusal 
expected — a no-op clear that doesn't throw fails. Then `reached` requires world.fire to throw /induced fault/ — no-op fails. Good.

  18. **Test 5 (epoch)**: real fixture. no-op processRestart that does nothing → epoch unchanged → harness's own processEpochProblem throws → 
the test's `expect(after).not.toBe(before)`... wait, if processRestart throws, the test fails on the throw. Good.

  19. **Test 6 (no-seam degradation)**: uses stubs directly. Fine.

  Now, anything the diff BREAKS its own tests wouldn't notice?

  - The reordering in emitKnown moved `state.transitions.set(event, true)` BEFORE the event push. Previously transition set last. Any test 
that fires and checks transitionCommitted mid-way? transitionCommitted is only called after fire completes. For non-fault path, end state 
identical. OK.

  - `sut.emit` — same path. OK.

  - One more possible break: **events pushed with `state: 'pending'` even after the fault rollback? No — event push happens after the try.

  - **`drainDeliveries` in AT-016.09's fault world**: fine.

  - **`burstThreadComments` increments `commentsInWindow` even when emitKnown throws (line 374: `commentsInWindow += 1` after the if/else).** 
If a fault were armed during a burst (AT-016.08 doesn't arm faults), the cap accounting would count crashed attempts. Not exercised. Skip — 
not diff-introduced... actually the counting line is pre-existing; fault interplay is new but no test combines them. Minor note at most; skip.

  - **Comment/code disagreement check**: 
    - _fixture.ts comment at 266-272 says "ONE ROLLBACK UNIT: a crash at the point puts the transition back the way it was, so neither side is 
committed." — but `nextId` was already consumed. The comment's claim "neither side is committed" is about transition+event; the id allocation 
is a third, unmentioned side effect. Disagreement-by-omission. Fold into finding.
    - faults.ts header: "The four judgements — is this point real, did the fault fire, did the restart restart anything" — says four but lists 
three clauses; the four predicates are faultPoint, faultFired, processEpoch, and sentinelValue is in sentinels.ts. "The four judgements" in 
faults.ts header is wrong-ish (three live here; the fourth, sentinel value, lives in sentinels.ts). Actually guards.ts header says H3 routes 
plant/at/clear/processRestart — four. faults.ts routes three of them. Minor comment nit: "The four judgements ... live in guards.ts and are 
routed to" — from faults.ts only three are routed. Borderline nit; mention briefly under code/comments.
    - index.ts comment at 140-144: accurate.
    - conformance comment: "line 28" and "line 50" — verified exact. "scan() has no caller anywhere in the tree" — grep confirmed (only 
selftest). OK.

  - **One more design-level check: AT-016.07's restart assertion.** The epoch changes but nothing else about the "process" — the fixture's 
restart is a counter bump. The test asserts durable state survives. Within loop-tier stand-in semantics that's the designed meaning; the 
harness-level processEpochProblem guarantees a no-op restart is caught. OK.

  - **faults.ts: `exposed()` spread `[...seam.points()]` per call — fine.

  - **faults.ts at(): validates point against `exposed()` but never validates `kind`** — kind validation delegated to the adapter's arm(). If 
an adapter accepted any kind silently (a future adapter), the harness wouldn't catch it. The req-016 adapter refuses. Contract says kinds 
fixed. Not a defect in this diff; the guard set has no faultKindProblem. The conformance test covers the fixture's refusal. Acceptable, could 
mention as observation... The gate says report findings only. I'll note it as a minor gap: the harness refuses unknown POINTS centrally but 
kind-validation is per-adapter, so the "armed nothing while reporting a trigger" protection depends on each adapter honoring it. Actually wait 
— is that a false-green vector? If a future adapter's arm() ignores kind and arms nothing but still counts reaches and throws... 
reachFaultPoint is the adapter's own. The atomicity oracle + clear() still function. The kind mismatch matters only if a suite asks for 
'reject' and gets 'crash' semantics — the test would observe crash behavior. Loud-ish. Minor.

  Ranking by blast radius:

  1. MEDIUM — _fixture.ts:258 — `nextId` not part of the rollback unit; comment claims one unit. Future suites firing after a crash see 
silently advanced ids. Also: eventId is allocated for an event that never exists — a later assertion counting "events with id ≤ N" or gap-free 
sequences could misread. Smallest fix: allocate the id lazily after the fault point (move `state.nextId++` below the try), or restore 
`state.nextId` in the catch.

  Wait, actually — think again about whether nextId rollback matters for "same event fired earlier" correctness. No, it's just id gaps.

  2. LOW-MEDIUM — faults.ts / _fixture.ts arm(): re-arming an already-armed point silently displaces the first arming; the first handle's 
clear() then refuses "never fired" even in a run where the suite believed it armed — and, worse direction, after the second handle is cleared 
the point is fully disarmed while the first handle is still live, so a suite holding handle A can run an "atomicity" section with NO fault 
armed at all; it is caught only at A.clear() (refusal), which is loud but late, and only if the suite calls clear before asserting... In 
AT-016.09's pattern, clear() is in finally before the oracle assertions — so the refusal throws before the oracle reads state. Actually in 
AT-016.09 the state assertions come AFTER clear() in the finally — so a silent disarm would be caught by clear()'s refusal before assertions. 
So the blast is contained IF suites follow the clear-before-assert pattern, which the harness cannot enforce... Actually can a suite assert 
before clear? Yes. Then "neither committed" could be observed with no fault armed — but that requires the product to genuinely not commit, 
which for a correct implementation is the expected behavior anyway → false green: the suite passes atomicity having injected nothing. The 
clear() refusal would still fire afterwards in finally → test still fails. OK so clear-in-finally saves it. But a suite that asserts and then 
clears: assertions pass falsely, then clear throws → test red. Loud. So still contained, provided clear is always called. If a suite never 
calls clear (no requirement to), nothing catches it. faultFiredProblem is only invoked from clear(). Hmm — is clear mandatory? AT-016.09 calls 
it. A suite that arms, fires, asserts, and never clears: the armed fault leaks into the adapter until teardown; the assertions ran with the 
fault armed (fine if this is the only arming). The displacement scenario needs double-arming — unusual. Small fix: `at()` refuses to arm a 
point already armed. Low.

  3. LOW — sentinel uniqueness is exact-equality only; substring-overlapping planted values can false-attribute presence (body.includes). A 
sentinel planted later whose value contains an earlier sentinel's value makes the earlier one "present" wherever the later landed. Guard could 
also reject any value that is a substring of / superstring of an already-planted value. The scan's whole claim "distinguishable" weakens. Low 
because values are AT-id/timestamp shaped.

  4. LOW — faults.ts header comment: "The four judgements" routed here — only three predicates are routed in faults.ts (sentinelValueProblem 
is routed in sentinels.ts). Comment nit; also says "is this point real, did the fault fire, did the restart restart anything" — three clauses 
for "four judgements". Confusing but harmless.

  5. Nit — `sentinels.ts` line ~52: `const bodies = seam ? [...seam.read(scope)] : [];` — dead defensive branch; comment explains. Not a 
finding.

  6. Check: kind not validated centrally — mention as observation.

  Category-by-category per the gate:

  1. FALSE GREEN: triggerCount counts only reaches; arming/clearing/teardown don't increment. clear() on never-fired refuses, and disarms 
first so the refusal doesn't leak the arming. The one hole in the family: double-arm displacement (finding 2).
  2. THE ROLLBACK: transition rolled back with previous-value restore — correct for repeat firing. Event/deliveries/ops are written after the 
point so nothing to roll back. nextId advanced and not restored (finding 1) — a partial rollback, currently unobserved by any oracle.
  3. THE TIGHTENED ORACLE: strictly stronger; control run prevents no-op rows passing; `continue` pushes a problem so it goes red, never skips 
silently. Verified falsification file + ran gate. One residual: the oracle doesn't assert the ops-item side for ops rows — a crash that left 
an ops item behind would pass... wait, can it? Ops item is pushed after the event write; a crash at the point leaves neither. The only fault 
point is between transition and event. So ops items can't exist without the event. eventWritten false ⇒ no ops item. Fine. Not a hole.
  4. ISOLATION: each open() is a fresh harness/adapter/state (registry.ts:608, 740-750); armedFaults cleared on adapter teardown; sentinels 
planted store per harness. 22 opens in AT-016.09 are independent. A throw before clear() is cleaned by harness teardown; and even mid-test, 
clear-in-finally disarms first. Clean.
  5. GUARDS CALLED: all four call sites route and act: plant→sentinelValueProblem (throws), at→faultPointProblem (throws, both no-seam and 
unknown-point branches), clear→faultFiredProblem (throws after disarm), processRestart→processEpochProblem (throws). Conformance tests drive 
each through the implementation. Verified.
  6. SENTINEL CONFORMANCE TESTS: audited each against a no-op — each fails (enumerated above). Absence is anchored by scope-registration 
refusal plus the empty→non-empty transition on the same scope. Substring-collision vector remains (finding 3).
  7. DECLARATION: ran --expect: matches exactly. AT-016.01 throws at line 28 (h.static) before plant at line 50 — verified by reading the 
test; capability names and order match index.ts:145.
  8. BREAKS/COMMENTS: comment "ONE ROLLBACK UNIT ... neither side is committed" omits the nextId allocation (folded into finding 1); faults.ts 
"four judgements" nit. Nothing else: ran full gate + conformance.

  Wait, one more check on question 3: "a fault that fires before the transition" — reachFaultPoint is after transitions.set, so the fault 
fires after the transition is tentatively set and rolls it back. Could a fault fire before the transition in some path? sut.emit → emitKnown 
same path. burstComments → emitKnown. Only one path. Fine.

  Also "a row that no-ops": control run catches it.

  One more possible finding for category 2: in the fault run, after rollback, `state.deliveries` — deliveries for OTHER events fired earlier 
in the same world remain, correctly. OK.

  And should I double check `GUARDED_ROWS` includes ops-item rows and 11 rows? proof-oracle shows 11 rows reported. Fine.

  Also confirm no other suites exist that could break from the emitKnown reorder — req-016 is the only suite. Conformance + full harness 
selftests? Let me quickly run the whole harness test dir to be safe? That could include runner blackbox tests that plant disposable adapters 
with three members — the OPTIONAL seam change was specifically for them. Run all tests in tests/at to be thorough.

 ❯ open harness/registry.ts:741:43
 ❯ EvidenceCaptureImpl.producer suites/req-016/d-taxonomy-evidence.test.ts:39:30
 ❯ harness/registry.ts:415:36
 ❯ EvidenceCaptureImpl.consume harness/registry.ts:428:7
 ❯ Object.capture harness/registry.ts:772:38
 ❯ suites/req-016/d-taxonomy-evidence.test.ts:69:34
 ❯ executeRegisteredBody harness/registry.ts:486:9
 ❯ harness/registry.ts:778:38
 ❯ runTrackedTest harness/registry.ts:555:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { atId: 'AT-016.03', phase: 'tier-unset' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/12]⎯


 Test Files  4 failed | 7 passed (11)
      Tests  12 failed | 149 passed (161)
   Start at  16:31:42
   Duration  6.54s (transform 937ms, setup 0ms, import 5.16s, tests 12.65s, environment 1ms)

• Both gates pass. Let me run the entire `tests/at` suite to catch anything the diff breaks outside its own tests.

• Failures are `tier-unset` — the suite tests need AT_TIER env set. That's the designed behavior (registry.ts:596 throws AtPending 
'tier-unset' when TIER is null). Re-run with AT_TIER=loop.

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  2 failed | 9 passed (11)
      Tests  2 failed | 159 passed (161)
   Start at  16:31:59
   Duration  6.46s (transform 945ms, setup 0ms, import 5.11s, tests 12.54s, environment 1ms)

• Those 12 failures are `tier-unset` — the suite tests require `AT_TIER` by design. Re-running with it set.


 ❯ suites/req-016/a-emitter-and-taxonomy.test.ts (2 tests | 1 failed) 22ms
     × AT-016.01 — the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path 16ms
 ❯ suites/req-016/c-reliability-guard.test.ts (3 tests | 1 failed) 49ms
     × AT-016.11 — sent only on provider acceptance; unconfirmed sends retry; a lost ack mints no duplicate 4ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  suites/req-016/a-emitter-and-taxonomy.test.ts > AT-REQ-016 A — single writer & static taxonomy > AT-016.01 — the one shared emitter is 
the sole writer; blockers/scope/lifecycle hold no direct send path
CapabilityPending: CAPABILITY PENDING — H3 static provider scan, H5 email provider simulator
 ❯ Object.get harness/capabilities.ts:46:15
     44|     {
     45|       get() {
     46|         throw new CapabilityPending(names);
       |               ^
     47|       },
     48|     },
 ❯ suites/req-016/a-emitter-and-taxonomy.test.ts:28:25
 ❯ executeRegisteredBody harness/registry.ts:486:3
 ❯ runTrackedTest harness/registry.ts:555:5
 ❯ harness/registry.ts:778:5
--
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  suites/req-016/c-reliability-guard.test.ts > AT-REQ-016 C — critical-event reliability guard > AT-016.11 — sent only on provider 
acceptance; unconfirmed sends retry; a lost ack mints no duplicate
CapabilityPending: CAPABILITY PENDING — H5 email provider simulator
 ❯ Object.get harness/capabilities.ts:46:15
     44|     {
     45|       get() {
     46|         throw new CapabilityPending(names);
       |               ^
     47|       },
     48|     },
 ❯ suites/req-016/c-reliability-guard.test.ts:142:17
 ❯ executeRegisteredBody harness/registry.ts:486:3
 ❯ runTrackedTest harness/registry.ts:555:5
 ❯ harness/registry.ts:778:5
• The two remaining failures are exactly the two declared reds (AT-016.01, AT-016.11), both CapabilityPending — matching the manifest. All 
green.

  Now write the report. Findings, ranked by blast radius:

  **Finding 1 (medium): `state.nextId` not part of the rollback unit** — _fixture.ts:258. eventId allocated and nextId incremented before the 
fault point; crash leaves it advanced. Comment at 266-272 claims "ONE ROLLBACK UNIT ... neither side is committed". Today no oracle reads id 
contiguity so it's unobservable in the current suite; but it's a partial rollback of exactly the shape the gate asks about, and a future suite 
that fires again after a crash will see a silent id gap — and if that gap ever influences an assertion (id-based ordering, "one id per 
committed event" counting via ids), it passes/fails for the wrong reason. Smallest fix: move `state.nextId++` after the fault point (compute 
eventId from `state.nextId` pre-point, increment only once the event write commits), or restore it in the catch.

  **Finding 2 (low-medium): re-arming an armed point silently displaces the live arming** — faults.ts `at()` + _fixture.ts:232 
`armedFaults.set(point, armed)`. The displaced handle keeps a counter object nothing will ever increment again; worse, when the replacement 
handle is cleared, `disarm()` deletes the map entry and the point becomes fully disarmed while the first handle is still live — a suite 
holding it believes a fault is armed when none is. Every exit from this state is loud only IF the suite calls `clear()` (faultFiredProblem 
fires with count 0 / stale count); a suite that asserts before clearing, or never clears, gets no protection. The displaced handle can also 
report a stale count from before displacement — a count that no longer corresponds to "reaches under this arming". Smallest fix: `at()` 
refuses to arm a point that already has a live arming (a fifth guard, or reuse faultPointProblem wording).

  Wait — actually can the displaced handle report a stale nonzero count? Sequence: arm A; fire → A.count=1; arm B (displaces); A.clear(): 
disarm is a no-op (identity check), faultFiredProblem(point, 1) → null → clear succeeds. That's legitimate-ish (A did fire once). But A's 
count froze at displacement; reaches after displacement count only on B. Fine, loud enough. The real vector is silent disarm after B's clear. 
Keep as low.

  **Finding 3 (low): sentinel uniqueness is exact-equality; substring collisions false-attribute presence** — guards.ts:47-51 checks only 
`planted === value`; sentinels.ts scan uses `body.includes(sentinel.value)`. Planting 'AT-016.01/blockers/123' after 
'AT-016.01/blockers/1234567'... more precisely: if value V2 contains earlier-planted V1 as a substring, any body carrying V2 is also reported 
as carrying V1 — presence attributed to an event that never carried V1. The guard's own docstring says reuse "cannot tell which event carried 
it" — the substring case is the same defect one level down. Smallest fix: refuse a value that contains, or is contained in, an already-planted 
value.

  **Finding 4 (nit): faults.ts header comment says "The four judgements"** — faults.ts:13-14 — but only three predicates are routed in this 
module (faultPointProblem, faultFiredProblem, processEpochProblem); the fourth (sentinelValueProblem) lives in sentinels.ts. The sentence then 
lists three clauses. Harmless, but the file's own standard is that comments are claims.

  Category-by-category:
  1. False green: nothing found in triggerCount/clear semantics themselves — the count is adapter-owned, incremented only in reachFaultPoint, 
arming/clearing/teardown add nothing; clear() refuses a never-fired fault and disarms first. The residual hole is finding 2's displacement 
path.
  2. Rollback: finding 1. Everything written after the point (event, deliveries, ops item) needs no rollback — verified the order. 
Previous-value restore for repeated same-event firing is correct.
  3. Tightened oracle: strictly stronger, verified by proof-oracle and my own gate run; control run closes the no-op row; `continue` pushes a 
problem so it cannot skip silently. Nothing found.
  4. Isolation: nothing found. Each open() builds its own harness/adapter/state (registry.ts:608, 740-750); armedFaults cleared on teardown 
(_fixture.ts:391); planted store is per-harness. A throw before clear() is covered by clear-in-finally (disarm-first) plus adapter teardown.
  5. Guards called: all four route and act; conformance tests drive each through the implementation. Verified.
  6. Sentinel conformance tests: audited each against a no-op implementation — plant/refusal test fails a no-op on the echo, id and refusal 
assertions; scan test fails a no-op on the presence assertion (empty→non-empty transition on the same scope also proves the scope is genuinely 
read); the unregistered-scope refusal separates "not there" from "did not look". Residual: finding 3.
  7. Declaration: ran `bun run at:verify req-016 --tier loop --expect` — matches exactly (10/2). AT-016.01 throws at 
a-emitter-and-taxonomy.test.ts:28 (h.static) before plant at :50; names and order match index.ts:145.
  8. Breaks/comments: full tests/at run (AT_TIER=loop): 159 pass, 2 fail — both failures are the declared CapabilityPending reds. Comment 
discrepancies: findings 1 (by omission) and 4.

  Also mention the kind-validation observation? "faults.at validates the point centrally but the kind only per-adapter" — the conformance test 
proves the req-016 adapter refuses, but a future adapter that accepts any kind silently would arm... and then the fault WOULD still fire (as a 
crash) and count — the suite asked for 'reject' and got 'crash', and the atomicity oracle still functions. The hazard is semantic (wrong fault 
semantics read as proof of the requested one). Given the gate's shape ("a point that accepted a kind it does not implement would arm nothing, 
still report a trigger" — the fixture comment itself names this), the harness relies on each adapter to refuse. It's a genuine gap in 
centralization: the harness cannot enumerate which kinds a point implements. Small. I'll include as a low observation under category 5/1.

  Write the final report, findings only, ranked by blast radius, with file:line, what's wrong, false-green mechanism, smallest fix. In plain 
English per AGENTS.md communication rule.

• Verification complete: the `--expect` gate matches exactly (10 green / 2 red), the conformance selftest passes 24/24, and a full `tests/at` run at loop tier fails only the two declared `CapabilityPending` reds. Findings, ranked by blast radius:

  ---

  **1. `state.nextId` is allocated before the fault point and never rolled back — the "ONE ROLLBACK UNIT" is not one unit.** `tests/at/suites/req-016/_fixture.ts:258`

  `const eventId = \`event-${state.nextId++}\`` runs before `reachFaultPoint(FAULT_POINT)` at line 276. A crash therefore consumes an id for an event that never exists, and the catch block at lines 277–281 restores only the transition. The comment at lines 266–272 claims "ONE ROLLBACK UNIT … so neither side is committed" — the id allocation is a third side effect, committed, and the comment does not mention it. Today nothing observes it (AT-016.09's fault world fires once and no oracle reads id contiguity), so it is a latent false-green/false-red vector rather than a live one: a future suite that fires again after a crash inherits a silently advanced counter, and any later assertion that reasons over event ids (ordering, one-id-per-committed-event, `ops-${eventId}` linkage across a retry) can pass or fail for the wrong reason. Smallest correct fix: compute `eventId` from `state.nextId` without incrementing, and increment only after the fault point, in the same breath as the event write — or restore `state.nextId` in the catch next to the transition restore.

  **2. Arming an already-armed point silently displaces the live arming, and clearing the replacement disarms the point entirely while the first handle is still live.** `tests/at/harness/faults.ts:56` (no check) + `tests/at/suites/req-016/_fixture.ts:232` (`armedFaults.set` overwrites)

  `at()` never checks whether the point already has a live arming. The displaced handle keeps a counter object that `reachFaultPoint` will never touch again (it looks up the map, line 216), and when the replacement handle is cleared, `disarm()` deletes the map entry — the point is then completely disarmed while the first handle's owner believes it is armed. Every exit from this state is loud only through `clear()` (`faultFiredProblem` on a zero or frozen count); a suite that asserts its oracle before calling `clear()`, or never calls `clear()` — nothing in the harness makes `clear()` mandatory — runs its atomicity assertion with no fault injected and gets no refusal anywhere. That is the "counts 'armed' as 'triggered'" catastrophe arriving through the side door: the run is not fault-injected at all and nothing says so. Smallest correct fix: `at()` refuses to arm a point that has a live arming, in the guard's own words, until the existing handle is cleared.

  **3. Sentinel uniqueness is exact-equality only; a substring-overlapping value false-attributes presence.** `tests/at/harness/guards.ts:47-51` + `tests/at/harness/sentinels.ts:60`

  `sentinelValueProblem` rejects only `planted === value`, but `scan()` matches with `body.includes(sentinel.value)`. Plant a value that contains an earlier planted value as a substring, and every body carrying the later value is also reported as carrying the earlier one — a sentinel is found "present" in a scope no event ever carried it to. This is the guard's own stated defect ("a reused sentinel cannot tell which event carried it") one level down, and it survives all six conformance tests because none plants overlapping values. Smallest correct fix: also refuse a value that contains, or is contained in, any already-planted value.

  **4. Kind validation is per-adapter, not routed through a guard.** `tests/at/harness/faults.ts:60`

  `at()` validates the *point* centrally through `faultPointProblem`, but the *kind* is validated only inside the req-016 adapter's `arm()` (`_fixture.ts:226`). The fixture's own comment names the hazard — a point that accepts a kind it does not implement "would arm nothing while reporting a trigger" — yet the harness has no `faultKindProblem` and no way to know which kinds a point implements, so that protection exists only where each adapter author remembered to write it. A future adapter that silently accepts `lose_ack` and arms a crash leaves the suite's "lost ack" scenario proving crash semantics instead, with every count and refusal still green. Smallest correct fix: extend the adapter seam to declare implemented kinds per point and refuse unknown kinds in `at()`, through a guard.

  **5. Comment nit: `faults.ts:13` says "The four judgements … are routed to" from this module, then lists three.** Only three predicates are routed in `faults.ts`; the fourth (`sentinelValueProblem`) is routed in `sentinels.ts`. Harmless, but this tree's own standard treats comments as claims.

  ---

  By category, where nothing was found:

  1. **False green in the counter itself:** nothing. The count is adapter-owned, incremented only inside `reachFaultPoint` (`_fixture.ts:217`), and arming, clearing, and teardown add nothing. `clear()` on a never-fired fault refuses, and disarms before judging so the refusal cannot leak the arming into the next id. The residual hole in this family is finding 2.
  2. **The rollback:** beyond finding 1, nothing. Event, deliveries, and ops item are all written after the fault point, so a crash leaves nothing of theirs to roll back; the previous-value restore is correct when the same event fired earlier (verified by reading, and the comment's claim checks out).
  3. **The tightened oracle:** nothing. `transitionCommitted || eventWritten` rejects a strict superset of the old form; the control run closes the no-op row; the control-run `continue` pushes a problem, so it can never skip silently — it goes red. Falsification in `proof-oracle.txt` reproduces against the merged code.
  4. **Isolation:** nothing. Every `open()` builds its own harness, adapter, and state (`registry.ts:608, 740-750`), so AT-016.09's 22 worlds share nothing; `armedFaults` is cleared on adapter teardown (`_fixture.ts:391`); the planted-sentinel store is per-harness; a throw before `clear()` is covered by clear-in-finally plus teardown.
  5. **Guards actually called:** all four route through the predicates and act on non-null results (throw after disarm in `clear()`'s case). The conformance tests drive each through the implementation rather than calling the predicate directly, and each fails against an implementation that computes-and-ignores.
  6. **Sentinel conformance tests as sole evidence:** audited each against a no-op. A no-op `Sentinels` fails the plant test (value echo, id, three refusals), the scan test (presence `toEqual([carried.value])`, and the empty→non-empty transition on the same scope proves the scope was genuinely read), and the unregistered-scope refusal is what keeps "not there" distinguishable from "did not look". Residual gap is finding 3.
  7. **The declaration:** ran `bun run at:verify req-016 --tier loop --expect` — matches exactly. AT-016.01 throws at `a-emitter-and-taxonomy.test.ts:28` (`h.static`) before `plant()` at line 50, and the two declared capability names match `index.ts:145` in content and order.
  8. **Breakage its own tests would miss:** full `tests/at` run at loop tier: 159 pass, the only 2 failures are the two declared `CapabilityPending` reds. Code/comment disagreements: findings 1 (by omission) and 5.

To resume this session: kimi -r session_0a2bbaf7-10c7-47b2-ab9d-b879cf5f357b
