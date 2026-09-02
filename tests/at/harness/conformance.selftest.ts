/**
 * The harness's conformance wall.
 *
 * Rule 2 of the suite-authoring rules puts the generic self-checks in the harness, once — and
 * names the price: a bug in a centralized guard green-lights all thirty suites at the same time,
 * with no suite showing a symptom. These tests are therefore not polish. Everything the suites
 * are no longer allowed to re-assert for themselves is proved here, on both the accepting and the
 * refusing side, because a guard that never refuses anything is indistinguishable from no guard.
 */

import { describe, expect, it } from 'vitest';

import { adapterDerivedCapability, stubbedCapabilityNames, witnessedCapability } from './capabilities.ts';
import { ControlledClock } from './clock.ts';
import { createFaults } from './faults.ts';
import { createFixtureSeed, FixtureWorldStore, LIFECYCLE_STATES } from './fixtures.ts';
import { bijectionProblems, type SuiteRegistration } from './check.ts';
import { buildCapabilityLedger, createHarness } from './index.ts';
import { createSentinels } from './sentinels.ts';
import {
  faultAlreadyArmedProblem,
  faultFiredProblem,
  faultPointProblem,
  MIN_SENTINEL_VALUE_LENGTH,
  processEpochProblem,
  sentinelValueProblem,
} from './guards.ts';
import { analyzeReportedTests, type AssertionResult, type RuntimeRegistration } from './runner.ts';
import {
  atTest,
  captureProducerProblem,
  drainTeardowns,
  executeRegisteredBody,
  freezeEvidence,
  requirementMismatch,
  runTrackedTest,
  testUseProblem,
  type TrackedTeardown,
} from './registry.ts';
import type { NotificationsSut, World } from '../suites/req-016/_contract.ts';

/** The guard configuration AT-016.08 drives, addressed the way a suite addresses it. */
const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';

/** The fault point AT-016.09 arms, addressed the way that suite addresses it. */
const FAULT_POINT = 'notifications.between_transition_and_event_write';
/** The only store the req-016 adapter registers as scannable. */
const SENTINEL_SCOPE = 'notifications.delivery_bodies';

describe('the five false-green reproductions', () => {
  it('refuses a passing body that never opens a world or consumes trusted evidence', async () => {
    expect(testUseProblem(0, 0)).toContain('never opened');
    expect(testUseProblem(1, 0)).toBeNull();

    const ctx = {
      atId: 'AT-016.01',
      open: async () => {
        throw new Error('open should not be called by this reproduction');
      },
      capture: async () => {
        throw new Error('capture should not be called by this reproduction');
      },
    };
    await expect(
      executeRegisteredBody(
        'AT-016.01',
        async () => {
          expect(true).toBe(true);
        },
        ctx,
        { opens: 0, captures: 0 },
      ),
    ).rejects.toThrow(/never opened/);
  });

  it('refuses a Vitest title that was not registered by atTest at runtime', () => {
    const result = analyzeReportedTests(['AT-016.01'], [], [{ title: 'AT-016.01 — placeholder', status: 'passed' }]);
    expect(result.rows[0]).toMatchObject({ id: 'AT-016.01', status: 'red' });
    expect(result.rows[0].detail).toContain('runtime registration');
  });

  it('refuses duplicate results instead of keeping the last result', () => {
    const registrations: RuntimeRegistration[] = [{ atId: 'AT-016.01', title: 'real test', surface: 'backend' }];
    const assertions: AssertionResult[] = [
      { title: 'AT-016.01 — real test', status: 'skipped' },
      { title: 'AT-016.01 — placeholder', status: 'passed' },
    ];
    const result = analyzeReportedTests(['AT-016.01'], registrations, assertions);
    expect(result.rows[0]).toMatchObject({ status: 'red' });
    expect(result.rows[0].detail).toContain('2 Vitest results');
  });

  it('refuses a zero-id acceptance suite', () => {
    expect(bijectionProblems([], [] as SuiteRegistration[]).join(' ')).toContain('zero P0');
  });

  /**
   * The sixth reproduction, added by AI4DEV-31: the id says one suite, the binding says another.
   *
   * Two independent strings have to denote the same suite — the AT id decides which fixture adapter
   * is loaded at RUN time, the binding decides which adapter the TYPES were read off. Left
   * unchecked, `AT-017.03` in a suite bound to req-016 drives req-017's implementation while every
   * type in the body describes req-016's, and both halves look correct on their own.
   *
   * The formats differ and the comparison MUST normalize: `parseAtId` yields `016` while the
   * binding and the registry key are `req-016`. A literal comparison would reject every valid suite
   * in the tree, so the happy path is asserted here too rather than left implied.
   */
  it('refuses an AT id whose requirement is not the suite it was bound to', () => {
    expect(requirementMismatch('AT-016.01', '016', 'req-016'), 'a valid suite was rejected by the guard').toBeNull();
    expect(requirementMismatch('AT-005.5.03', '005.5', 'req-005.5'), 'a dotted requirement id was rejected').toBeNull();

    const mismatch = requirementMismatch('AT-017.03', '017', 'req-016');
    expect(mismatch, 'the guard did not name the requirement the harness would actually load').toContain('req-017');
    expect(mismatch, 'the guard did not name the requirement the type-check described').toContain('req-016');

    const missing = requirementMismatch('AT-016.01', '016', '');
    expect(missing, 'an absent requirement was treated as "nothing to check" rather than as an error').toContain(
      'no requirement',
    );

    // AND THE GUARD IS ACTUALLY WIRED IN. A problem computed and not acted on is this tree's own
    // recurring false-green shape, so the pure function above is not enough on its own. Both calls
    // throw before `it()` is ever reached, which is why registering here adds no test to this run.
    expect(() =>
      atTest('AT-017.03', 'bound to the wrong suite', { requirement: 'req-016', sut: 'notifications' }, async () => undefined),
    ).toThrow(/req-017/);

    // The suites the runner's black-box tests generate are written as source at run time and are
    // never type-checked, so this guard has to hold for a caller TypeScript never saw. The cast
    // reproduces exactly that caller and nothing else.
    const untyped = atTest as unknown as (atId: string, title: string, opts: object, body: () => Promise<void>) => void;
    expect(() => untyped('AT-016.01', 'no requirement at all', { sut: 'notifications' }, async () => undefined)).toThrow(
      /no requirement/,
    );
  });

  it('derives stand-in provenance from the constructor, not capability self-report', () => {
    // The meaning this test has always carried: a VALUE that claims it stubbed nothing is still
    // counted a stand-in, because the ledger is not built from anything the value says about
    // itself. It used to call the deleted stand-in-labelling factory; `fixtures.worlds` is now
    // built on the adapter-derived route, so that is the route this reproduction goes through.
    const dishonest = adapterDerivedCapability(
      'fixtures.worlds',
      { stubbedCapabilities: () => [] },
      'file:///probe/tests/at/suites/req-016/_fixture.ts',
    );
    expect(stubbedCapabilityNames([dishonest])).toEqual(['fixtures.worlds']);
  });
});

/**
 * PROVENANCE IS A VERDICT THE HARNESS COMPUTES, NOT A WORD A CALLER WRITES (AI4DEV-48).
 *
 * The measured hole: calling the real-labelling factory for `clock.controlled` and four names like
 * it turned the stand-in ledger empty, and `registry.ts` — which refuses any stubbed capability
 * above the loop tier — then had nothing to refuse. That API is gone, so these tests are about the
 * mechanism that replaced it, and the second one is the one that matters most: a witness that
 * cannot classify a value must REFUSE it, because "I found no stand-in seam" is not evidence of
 * real backing. That was the shape of the first draft's own defect.
 */
describe('provenance is computed from the value or the loader, and refuses what it cannot classify', () => {
  it('refuses a capability name no witness has decided about, naming the name', () => {
    // A name off the closed table: nobody has decided about it, so it is an error here rather than
    // a default in either direction.
    expect(() => witnessedCapability('vendors.sms', { email: {} })).toThrow(/vendors\.sms/);
    expect(() => witnessedCapability('vendors.sms', {})).toThrow(/no witness is registered/);

    // AND THE SUT FAMILY IS GENUINELY OFF THE TABLE, rather than swallowed by a `sut.*` prefix. A
    // prefix rule would mean nobody ever decided about any SUT name — an unlimited namespace inside
    // a table whose whole claim is that it is closed.
    expect(() => witnessedCapability('sut.notifications', {})).toThrow(/sut\.notifications/);
  });

  it('refuses a KNOWN capability name whose value is malformed, instead of classifying it real', () => {
    // THE SINGLE MOST IMPORTANT ASSERTION IN THIS FILE. Each value below is a known name whose
    // control seam is absent or half present. A witness returning "real" because it found nothing
    // to say is the deleted real-labelling factory reached through a different door.
    expect(() => witnessedCapability('clock.controlled', {}), 'a clock with no seam at all was classified').toThrow(
      /no callable Clock control seam/,
    );
    expect(
      () => witnessedCapability('clock.controlled', { freezeAt: async () => undefined }),
      'a clock that can be frozen but not advanced was classified — half a control seam is not a verdict',
    ).toThrow(/clock\.controlled/);
    expect(() => witnessedCapability('vendors.email', {}), 'a vendor wrapper with no sim behind it was classified').toThrow(
      /no callable EmailProviderSim control seam/,
    );
    expect(
      () => witnessedCapability('vendors.email', { email: { attempts: () => [] } }),
      'a vendor sim that cannot be told to reject was classified — half a control seam is not a verdict',
    ).toThrow(/vendors\.email/);

    // AND THE REFUSALS DISCRIMINATE. A witness that refused everything would satisfy every
    // assertion above and leave the harness unable to build — and the callability test has to walk
    // the PROTOTYPE CHAIN, because `advance` is a method on `ControlledClock.prototype` and an
    // own-property test would refuse the real clock on its first run.
    const clock = witnessedCapability('clock.controlled', new ControlledClock());
    expect(clock.provenance, 'the real controlled clock was refused — the witness is reading own properties').toBe(
      'stand-in',
    );
    expect(clock.standInReason, 'the stand-in verdict does not name the seam that produced it').toContain('freezeAt');
  });

  it('refuses a witnessed name on the adapter-derived route, so the two routes cannot overlap', () => {
    // ROUTING AROUND THE TABLE. Every outcome of the adapter-derived route is stand-in, so this is
    // never a false green — but it was a second door onto the ledger for a name the closed table
    // would have REFUSED, and a function that stamps stand-in on any name at all is the deleted
    // labelling factory wearing a mandatory reason string.
    const strippedClock = { freezeAt: async () => undefined };
    expect(
      () => witnessedCapability('clock.controlled', strippedClock),
      'the witness stopped refusing half a control seam, so this reproduction proves nothing',
    ).toThrow(/no callable Clock control seam/);
    expect(
      () => adapterDerivedCapability('clock.controlled', strippedClock, 'file:///probe/_fixture.ts'),
      'a name the witness table would have REFUSED was minted as a stand-in through the other route',
    ).toThrow(/a witness is registered for that name/);

    // AND THE ROUTE IS BOUNDED IN THE OTHER DIRECTION TOO: it builds its own two families and
    // nothing else, so an unwitnessed name has no route at all rather than a permissive one.
    expect(
      () => adapterDerivedCapability('vendors.sms', {}, 'file:///probe/_fixture.ts'),
      'a name belonging to neither family and to no witness was given a provenance anyway',
    ).toThrow(/belongs on the witness table/);
    expect(() => adapterDerivedCapability('sut.', {}, 'file:///probe/_fixture.ts')).toThrow(/adapter-derived route/);

    // The two families it DOES build still build — the runner's black-box adapters produce
    // `sut.probe`, and a refusal here would break every generated tree.
    expect(adapterDerivedCapability('sut.probe', {}, 'file:///probe/_fixture.ts').provenance).toBe('stand-in');
    expect(adapterDerivedCapability('fixtures.worlds', {}, 'file:///probe/_fixture.ts').provenance).toBe('stand-in');
  });

  it('reads every reference capability off the ledger as a stand-in that names what makes it one', async () => {
    // THROUGH THE EXPORTED LEDGER BUILDER, not through `createHarness()`: the harness returns only
    // `.value` fields, so the reasons are not reachable from an `AtHarness` at all — which is the
    // point, since a diagnostic there would sit in front of every suite.
    const ledger = await buildCapabilityLedger({ requirement: 'req-016', tier: 'loop' });
    try {
      const sut = ledger.sut.find((entry) => entry.name === 'sut.notifications');
      expect(sut, 'the reference adapter registered no sut.notifications capability').toBeDefined();

      for (const entry of [ledger.clock, ledger.vendors, ledger.fixtures, sut!]) {
        expect(entry.provenance, `${entry.name} is not on the stand-in ledger`).toBe('stand-in');
        expect(entry.realEvidence, `${entry.name} carries real evidence and a stand-in verdict at once`).toBeNull();
      }

      // NOT A GENERIC STRING. A reason that said "stand-in" and nothing else would tell a reader
      // nothing about what would have to be removed to make it stop being one.
      expect(ledger.clock.standInReason, 'the clock reason does not name the control seam').toContain('freezeAt/advance');
      expect(ledger.vendors.standInReason, 'the vendor reason does not name the control seam').toContain(
        'email.rejectNext',
      );
      expect(ledger.fixtures.standInReason, 'the fixtures reason does not name the module it was loaded from').toContain(
        '_fixture.ts',
      );
      expect(sut!.standInReason, 'the sut reason does not name the module it was loaded from').toContain('_fixture.ts');
    } finally {
      await ledger.teardown();
    }
  });

  it('reports the three harness-owned capabilities real through the accepting branch, not by absence from a list', async () => {
    const ledger = await buildCapabilityLedger({ requirement: 'req-016', tier: 'loop' });
    try {
      // A guard that refuses everything is as broken as one that refuses nothing, so the accepting
      // branch is asserted positively: each of these carries the witness's own words for why it is
      // the article rather than a substitute for one.
      for (const entry of [ledger.config, ledger.sentinels, ledger.faults]) {
        expect(entry.provenance, `${entry.name} did not reach the accepting branch`).toBe('real');
        expect(entry.standInReason, `${entry.name} is real and carries a stand-in reason at once`).toBeNull();
        expect(entry.realEvidence, `${entry.name} came back real with nothing said about why`).toContain('article');
      }
    } finally {
      await ledger.teardown();
    }
  });

  it('refuses to build an integration-tier harness at all when no slot attestation reached this process', async () => {
    /*
     * THIS TEST REPLACED ONE THAT ASSERTED A NON-EMPTY STUBBED LIST HERE, and the replacement is the
     * point rather than a consequence. An integration-tier ledger is now built out of live articles
     * against a prepared database slot, and the FIRST thing it does is the attestation round trip:
     * read back, through the coordinates this process was handed, the nonce the runner minted after
     * its reset. This process was launched by vitest with no slot at all, so there is nothing to
     * read back and the construction stops before anything is built.
     *
     * WHY THAT IS THE RIGHT SHAPE. The old behaviour built a ledger of stand-ins and let the caller
     * discover them afterwards. The failure direction is the same — nothing goes green — but the
     * refusal now names the missing evidence instead of naming the substitutes, and it arrives
     * before a database connection is attempted rather than after.
     *
     * WHAT IT STILL DOES NOT PROVE: that the registry gate fires. That enforcement lives in
     * `openWorld`, which is not exported and cannot be called from here.
     */
    await expect(createHarness({ requirement: 'req-016', tier: 'integration' })).rejects.toThrow(/refusing to attest the slot/);
  });
});

describe('the harness reports its own provenance honestly', () => {
  it('names exactly the capabilities it stubbed, and never counts the config registry among them', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const stubbed = await h.stubbedCapabilities();
      // The whole ledger, not a subset: a capability that quietly dropped off this list is a
      // stand-in an integration-tier run would then accept, which is the /pm-done gate grading a
      // substitute for the thing it exists to gate.
      expect(stubbed, 'the loop-tier harness no longer reports the stand-ins it actually built').toEqual([
        'clock.controlled',
        'fixtures.worlds',
        'sut.notifications',
        'vendors.email',
      ]);
      expect(
        stubbed,
        'the at-config registry was reported as a stand-in — it IS the registry of pinned values, not a substitute for one',
      ).not.toContain('config.registry');
    } finally {
      await h.teardown();
    }
  });
});

describe('a teardown failure fails the test instead of disappearing', () => {
  it('fails a body that PASSED when the world teardown rejects', async () => {
    const worlds: TrackedTeardown[] = [
      {
        what: 'fixture world "probe"',
        teardown: async () => {
          throw new Error('the world never released what it holds');
        },
      },
    ];
    await expect(
      runTrackedTest(
        'AT-016.02',
        async () => {
          /* a body that asserts nothing wrong at all */
        },
        worlds,
        [],
      ),
    ).rejects.toThrow(/never released what it holds/);
  });

  it('keeps the body error when both fail, and still tears everything down, worlds before harnesses', async () => {
    const order: string[] = [];
    const worlds: TrackedTeardown[] = [
      { what: 'world one', teardown: async () => void order.push('world one') },
      {
        what: 'world two',
        teardown: async () => {
          order.push('world two');
          throw new Error('a teardown failure that must not mask the body');
        },
      },
    ];
    const harnesses: TrackedTeardown[] = [{ what: 'harness', teardown: async () => void order.push('harness') }];

    await expect(
      runTrackedTest(
        'AT-016.02',
        async () => {
          throw new Error('the body itself failed');
        },
        worlds,
        harnesses,
      ),
    ).rejects.toThrow('the body itself failed');

    // Last-opened-first within worlds, then the harnesses — and the rejection in the middle did
    // not stop the rest, because whatever is left standing leaks into the next id.
    expect(order).toEqual(['world two', 'world one', 'harness']);
  });

  it('attempts every teardown and reports each failure by name', async () => {
    const failures = await drainTeardowns(
      [
        {
          what: 'world A',
          teardown: async () => {
            throw new Error('A refused');
          },
        },
      ],
      [
        {
          what: 'harness B',
          teardown: async () => {
            throw new Error('B refused');
          },
        },
      ],
    );
    expect(failures.map((failure) => failure.what)).toEqual(['world A', 'harness B']);
  });
});

describe('the centralized generic guards refuse as well as accept', () => {
  it('accepts a long unique sentinel and refuses a short one, a blank one, a reused one and an overlapping one', () => {
    const good = 'AT-016.01/blockers/1767225600000';
    expect(good.length).toBeGreaterThanOrEqual(MIN_SENTINEL_VALUE_LENGTH);
    expect(sentinelValueProblem(good, [])).toBeNull();
    expect(sentinelValueProblem('short', [])).toContain('characters');
    expect(sentinelValueProblem('   ', [])).toContain('non-empty');
    expect(sentinelValueProblem(good, [good])).toContain('planted before');

    // OVERLAP, both directions. The scan asks whether a body CONTAINS the value, so a value that
    // extends an already-planted one — or that an already-planted one extends — makes every body
    // carrying either report both present. Equality was the only case this guard used to reject,
    // and substring matching is what makes that insufficient.
    expect(
      sentinelValueProblem(`${good}/extended`, [good]),
      'a value containing an earlier one was accepted — every body carrying it would report the earlier one present too',
    ).toContain('overlaps');
    expect(
      sentinelValueProblem(good, [`${good}/extended`]),
      'a value contained in an earlier one was accepted — the harm is symmetric and so must the refusal be',
    ).toContain('overlaps');
    expect(
      sentinelValueProblem(good, ['AT-016.02/scope/1767225600000']),
      'two distinct sentinels of the same shape were refused as overlapping — the guard stopped discriminating',
    ).toBeNull();
  });

  it('accepts a fault point the product exposes and refuses one it does not', () => {
    const exposed = ['notifications.between_transition_and_event_write'];
    expect(faultPointProblem(exposed[0], exposed)).toBeNull();
    const problem = faultPointProblem('notifications.typo', exposed) ?? '';
    expect(problem).toContain('exposes no fault point');
    expect(problem, 'the refusal does not say which points DO exist, so a typo is hard to see').toContain(exposed[0]);
  });

  it('accepts arming a point nothing holds and refuses one that already has a live arming', () => {
    const point = 'notifications.between_transition_and_event_write';
    expect(faultAlreadyArmedProblem(point, [])).toBeNull();
    expect(faultAlreadyArmedProblem(point, ['notifications.other'])).toBeNull();
    const problem = faultAlreadyArmedProblem(point, ['notifications.other', point]) ?? '';
    expect(problem, 'a second arming of a live point was accepted').toContain('already armed');
    expect(problem, 'the refusal does not say what to do about it').toContain('Clear the existing handle');
  });

  it('accepts a fault that fired and refuses one that was merely armed', () => {
    expect(faultFiredProblem('notifications.x', 1)).toBeNull();
    expect(faultFiredProblem('notifications.x', 0)).toContain('never fired');
    expect(faultFiredProblem('notifications.x', -1)).toContain('nonsensical');
  });

  it('accepts a changed process epoch and refuses an unchanged or empty one', () => {
    expect(processEpochProblem('epoch-1', 'epoch-2')).toBeNull();
    expect(processEpochProblem('epoch-1', 'epoch-1')).toContain('restarted nothing');
    expect(processEpochProblem('epoch-1', '')).toContain('empty epoch');
  });
});

/**
 * H3's wall, and the reason it is not a formality.
 *
 * The blocks above test the guards AS PURE FUNCTIONS. That is not enough, and this file says so
 * about itself thirty lines up: a problem computed and not acted on is "this tree's own recurring
 * false-green shape". Nothing above proves that `plant`, `at`, `clear` and `processRestart` ever
 * CALL the predicate that would refuse them.
 *
 * And for sentinels the stakes are higher still. `req-016` is the only suite that exists; its one
 * sentinel consumer, `AT-016.01`, throws at `h.static.providerClientImporters()` on line 28 and never
 * reaches `plant()` on line 50, and `scan()` has no caller anywhere in the tree. So a completely
 * NO-OP `Sentinels` would satisfy `at:verify req-016 --tier loop --expect` from end to end. These
 * tests are therefore not supporting evidence for half this capability — they are the entire
 * evidence, and every one of them is written so that a no-op fails it.
 *
 * They drive `createHarness()` rather than hand-built parts wherever the real fixture can produce the
 * condition, for the reason the clock test gives: what is worth proving is the object a suite is
 * really handed. Only the two conditions the conforming fixture cannot produce — an unchanged epoch,
 * and an adapter offering no seam at all — are built from stubs, and each says so where it sits.
 */
describe('the H3 wall: sentinels and fault injection call the guards, and refuse', () => {
  it('plants a usable marker and refuses a blank, a short, a reused and an overlapping value', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const value = 'conformance/plant/1767225600000';
      const sentinel = await h.sentinels.plant('notification-body', value);
      expect(sentinel.value, 'plant() did not hand back the value it was asked to plant').toBe(value);
      expect(sentinel.id.length, 'the sentinel carries no id, so two plantings are indistinguishable').toBeGreaterThan(0);

      // The refusals are the guard's judgement, reached through the implementation rather than
      // called directly: a plant() that computed sentinelValueProblem and ignored it passes every
      // test in the block above and fails all four of these.
      await expect(h.sentinels.plant('notification-body', 'short')).rejects.toThrow(/characters/);
      await expect(h.sentinels.plant('notification-body', '   ')).rejects.toThrow(/non-empty/);
      await expect(h.sentinels.plant('notification-body', value)).rejects.toThrow(/planted before/);

      // OVERLAP, through the implementation. `scan()` matches with `body.includes()`, so planting a
      // value that extends a live one would make every body carrying the longer one report the
      // shorter one present as well — a sentinel found in a scope no event carried it to.
      await expect(
        h.sentinels.plant('notification-body', `${value}/extended`),
        'a value extending a planted one was accepted, so the scan can report it present off the other one alone',
      ).rejects.toThrow(/overlaps/);
    } finally {
      await h.teardown();
    }
  });

  it('finds a planted sentinel where it landed, reports absence from a scope it really read, and refuses a scope nothing registered', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const world = (await h.fixtures.world('sentinel-scan')) as World;
      const sut = h.sut.notifications as NotificationsSut;

      const carried = await h.sentinels.plant('notification-body', 'conformance/carried/1767225600001');
      const neverFired = await h.sentinels.plant('notification-body', 'conformance/absent/1767225600002');

      // ABSENCE, from a scope that is real and was searched. This is the assertion the whole design
      // of scan() turns on: before it can mean anything, "not there" has to be distinguishable from
      // "did not look", and the refusal at the end of this test is what makes it so.
      expect(
        await h.sentinels.scan(SENTINEL_SCOPE),
        'a scope holding nothing did not come back empty',
      ).toEqual([]);

      await world.fire('blocker.raised', { sentinel: carried.value });
      await sut.drainDeliveries();

      expect(
        (await h.sentinels.scan(SENTINEL_SCOPE)).map((found) => found.value),
        'the sentinel that was carried into a delivery body was not found by the scan',
      ).toEqual([carried.value]);
      expect(
        (await h.sentinels.scan(SENTINEL_SCOPE)).map((found) => found.id),
        'a sentinel nothing carried was reported present — the scan is matching on something other than the value',
      ).not.toContain(neverFired.id);

      const refusal = await h.sentinels.scan('notifications.nowhere').then(
        () => null,
        (err: Error) => err.message,
      );
      expect(
        refusal,
        'scanning a scope the adapter never registered returned instead of refusing, so "absent" and "never looked" are the same answer again',
      ).toContain('no sentinel scope named');
      expect(refusal, 'the refusal does not say which scopes DO exist, so a typo is hard to see').toContain(SENTINEL_SCOPE);
    } finally {
      await h.teardown();
    }
  });

  it('refuses a fault point the product does not expose, and a kind the point does not implement', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      expect(await h.faults.points(), 'the fixture stopped exposing the point AT-016.09 arms').toEqual([FAULT_POINT]);

      const refusal = await h.faults.at('notifications.typo', 'crash').then(
        () => null,
        (err: Error) => err.message,
      );
      expect(
        refusal,
        'arming a point nothing exposes was a no-op, so the atomicity oracle would read "both committed" as proof while no fault was ever injected',
      ).toContain('exposes no fault point');
      expect(refusal, 'the refusal does not name the points that DO exist').toContain(FAULT_POINT);

      // The kind is part of the arming. A point that accepted a kind it does not implement would
      // arm nothing, still report a trigger when execution passed it, and read as fault-injected.
      await expect(h.faults.at(FAULT_POINT, 'lose_ack')).rejects.toThrow(/implements no/);
    } finally {
      await h.teardown();
    }
  });

  it('counts reaching the armed point and never counts arming it, and refuses to clear a fault that never fired', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const world = (await h.fixtures.world('fault-count')) as World;

      const neverReached = await h.faults.at(FAULT_POINT, 'crash');
      expect(neverReached.point, 'the handle reports a point other than the one it was armed at').toBe(FAULT_POINT);
      expect(
        await neverReached.triggerCount(),
        'arming was counted as firing — every atomicity test in every future suite would then pass on a fault that never happened',
      ).toBe(0);
      await expect(
        neverReached.clear(),
        'a fault that was armed and never reached was cleared without complaint',
      ).rejects.toThrow(/never fired/);

      const reached = await h.faults.at(FAULT_POINT, 'crash');
      await expect(world.fire('payment.succeeded'), 'the induced crash did not surface at all').rejects.toThrow(
        /induced fault/,
      );
      expect(
        await reached.triggerCount(),
        'execution reached the armed point and the handle did not count it',
      ).toBe(1);
      await reached.clear();
    } finally {
      await h.teardown();
    }
  });

  it('refuses to arm a point that already holds a live arming, and lets a cleared point be armed again', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const world = (await h.fixtures.world('fault-displacement')) as World;

      const first = await h.faults.at(FAULT_POINT, 'crash');
      await expect(
        h.faults.at(FAULT_POINT, 'crash'),
        'a second arming displaced the live one silently — the first handle would then count a point ' +
          'nothing reaches, and clearing the replacement would disarm the point while that handle ' +
          'still reported itself armed',
      ).rejects.toThrow(/already armed/);

      // The surviving arming is the FIRST one, and it is the one that catches the fault. A
      // displacement that had been allowed would leave this count at zero.
      await expect(world.fire('payment.succeeded'), 'the induced crash did not surface at all').rejects.toThrow(
        /induced fault/,
      );
      expect(await first.triggerCount(), 'the arming that survived did not count the fault it caught').toBe(1);
      await first.clear();

      // CLEARING RELEASES THE POINT. A reservation that outlived its handle would make the point
      // unarmable for the rest of this harness's life — the refusal turning into a second silent
      // hole in place of the first.
      const second = await h.faults.at(FAULT_POINT, 'crash');
      await expect(world.fire('payment.succeeded')).rejects.toThrow(/induced fault/);
      await second.clear();

      // A REFUSED arming reserves nothing either: this one is rejected inside the adapter, on the
      // kind, after the point check — so the point must still be free afterwards.
      await expect(h.faults.at(FAULT_POINT, 'lose_ack')).rejects.toThrow(/implements no/);
      const third = await h.faults.at(FAULT_POINT, 'crash');
      await expect(world.fire('payment.succeeded')).rejects.toThrow(/induced fault/);
      await third.clear();
    } finally {
      await h.teardown();
    }
  });

  it('consumes no event id when the crash rolls the emit back, so the surviving event is still event-1', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const world = (await h.fixtures.world('fault-id-rollback')) as World;
      const sut = h.sut.notifications as NotificationsSut;

      const armed = await h.faults.at(FAULT_POINT, 'crash');
      await expect(world.fire('payment.succeeded'), 'the induced crash did not surface at all').rejects.toThrow(
        /induced fault/,
      );
      await armed.clear();

      // THE ID ALLOCATION IS A SIDE EFFECT LIKE ANY OTHER, and it is the one the rollback used to
      // miss. Allocated before the fault point, the crashed emit spent `event-1` on an event that
      // was never written, the next firing came back `event-2` with no `event-1` anywhere, and the
      // rollback's own comment called itself one unit while a third thing survived the crash.
      //
      // This case exists because NOTHING ELSE IN THE TREE READS ID CONTIGUITY: move the allocation
      // back above the try/catch and every suite stays green, so a repair nobody can notice being
      // undone is on the same footing as the defect it repaired.
      const { eventId } = await world.fire('payment.succeeded');
      expect(
        eventId,
        'the crashed emit consumed an event id — the rollback left the counter advanced, so the ids no longer match the events that exist',
      ).toBe('event-1');
      expect(
        (await sut.events({ type: 'payment.succeeded' })).map((event) => event.id),
        'the one event that survived does not carry the id its own fire() reported',
      ).toEqual(['event-1']);
    } finally {
      await h.teardown();
    }
  });

  it('changes the delivery process identity on restart, and refuses a restart that changed nothing', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const before = await h.faults.processEpoch();
      expect(before.trim().length, 'the delivery process has no identity, so no restart can be observed').toBeGreaterThan(0);
      await h.faults.processRestart();
      expect(
        await h.faults.processEpoch(),
        'processRestart() left the identity unchanged — every "survives a restart" assertion above it would be about a process that never stopped',
      ).not.toBe(before);
    } finally {
      await h.teardown();
    }

    // A STUB, and only because the conforming fixture cannot produce this condition: its restart
    // always changes the epoch. What is under test is the harness's routing to processEpochProblem,
    // so the seam that lies is the fixture's half, deliberately.
    const restartsNothing = createFaults({
      points: () => [],
      arm: () => {
        throw new Error('this stub exposes no points, so nothing can arm one');
      },
      processEpoch: () => 'delivery-process-1',
      processRestart: () => undefined,
    });
    await expect(
      restartsNothing.processRestart(),
      'a restart that left the process identity exactly as it was returned successfully',
    ).rejects.toThrow(/restarted nothing/);
  });

  it('lets the process that first sent a delivery keep it, so a send before a restart is told apart from one after', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const world = (await h.fixtures.world('epoch-stamp')) as World;
      const sut = h.sut.notifications as NotificationsSut;

      const before = await h.faults.processEpoch();
      await world.fire('payment.succeeded');
      await sut.drainDeliveries();

      await h.faults.processRestart();
      const after = await h.faults.processEpoch();
      await world.fire('payment.failed');
      await sut.drainDeliveries();

      // WHAT `_contract.ts` PROMISES ABOUT `deliveredByProcess`: a send that happened after a
      // restart carries a different string than one that happened before it. That is only true if
      // the FIRST send owns the stamp — a drain that re-stamps every row it sweeps records the
      // identity of the last drain instead, and the earlier send is retroactively attributed to a
      // process that did not perform it. Nothing else in the tree can tell those two apart:
      // AT-016.07 drains once, after its restart, so it reads the same value either way.
      const sentBefore = (await sut.deliveries({ type: 'payment.succeeded' })).map((d) => d.deliveredByProcess);
      const sentAfter = (await sut.deliveries({ type: 'payment.failed' })).map((d) => d.deliveredByProcess);
      expect(sentBefore.length, 'the pre-restart send produced no delivery to attribute').toBeGreaterThan(0);
      expect(sentAfter.length, 'the post-restart send produced no delivery to attribute').toBeGreaterThan(0);
      expect(
        [...new Set(sentBefore)],
        'a delivery sent BEFORE the restart was re-stamped by the later drain — the field reports the last drain, not the process that sent it',
      ).toEqual([before]);
      expect(
        [...new Set(sentAfter)],
        'the post-restart send does not carry the identity the process had when it performed it',
      ).toEqual([after]);
    } finally {
      await h.teardown();
    }
  });

  it('degrades an adapter that exposes neither seam to a loud refusal, never to a no-op', async () => {
    // The seams are OPTIONAL on the adapter because the runner's black-box trees plant disposable
    // adapters with three members and no more. Optional must not become silent: absence has to be
    // refused at USE, and the same guards write those refusals.
    const noFaults = createFaults();
    expect(await noFaults.points()).toEqual([]);
    await expect(noFaults.at(FAULT_POINT, 'crash')).rejects.toThrow(/Exposed points: \(none\)/);
    await expect(noFaults.processRestart()).rejects.toThrow(/empty epoch/);

    // Planting still works with no adapter at all — it is the harness's own act — but a scan has
    // nothing it could honestly have read, so every scope is refused.
    const noScopes = createSentinels();
    const sentinel = await noScopes.plant('notification-body', 'conformance/no-seam/1767225600003');
    expect(sentinel.value).toBe('conformance/no-seam/1767225600003');
    await expect(noScopes.scan(SENTINEL_SCOPE)).rejects.toThrow(/Exposed scopes: \(none\)/);
  });
});

describe('the H2 fixture and clock conformance wall', () => {
  it('refuses a capture producer that never opens and freezes nested evidence', () => {
    expect(captureProducerProblem(0, 0)).toContain('without open');
    expect(captureProducerProblem(0, 1)).toBeNull();

    const evidence = freezeEvidence({ nested: { values: ['original'] } });
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence.nested)).toBe(true);
    expect(Object.isFrozen(evidence.nested.values)).toBe(true);
    expect(() => evidence.nested.values.push('mutation')).toThrow();
  });

  it('refuses evidence in a shape that freezing would not actually close, naming where it sits', () => {
    // Object.freeze seals a Map's own properties and leaves set()/delete() working, so a capture
    // carrying one would LOOK immutable while one lens could still rewrite the next lens's
    // evidence. The path is part of the refusal: a producer has to be able to find the value.
    const withMap = () => freezeEvidence({ rows: { deliveries: [{ at: new Map<string, string>() }] } });
    expect(withMap).toThrow(/rows\.deliveries\[0\]\.at/);
    expect(withMap).toThrow(/Map/);
    expect(() => freezeEvidence({ when: new Date() })).toThrow(/Date/);
    expect(() => freezeEvidence({ seen: new Set<string>() })).toThrow(/Set/);
    expect(() => freezeEvidence({ render: () => 'x' })).toThrow(/function/);
  });

  it('builds all nine lifecycle states and isolates each world deeply', async () => {
    expect(LIFECYCLE_STATES).toHaveLength(9);
    const store = new FixtureWorldStore(createFixtureSeed());
    const first = await store.world('first');
    const second = await store.world('second');

    first.state.projects[0].title = 'mutated';
    first.state.ledger.push({ id: 'extra', amount: 99, kind: 'test' });

    expect(second.state.projects[0].title).not.toBe('mutated');
    expect(second.state.ledger.some((row) => row.id === 'extra')).toBe(false);

    await first.teardown();
    expect(() => first.assertActive()).toThrow(/torn down/);
    await store.teardown();
  });

  it('makes product behavior read the controlled clock, through the canonical assembly', async () => {
    // Through createHarness(), not hand-built parts: the thing worth proving is that the clock the
    // harness HANDS A TEST is the clock the product behaviour behind that harness reads. A clock
    // wired up locally in this file proves that this file can wire a clock.
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const cap = h.config.get<number>(GUARD_CAP_KEY);
      const windowMs = h.config.get<number>(GUARD_WINDOW_KEY);
      const world = (await h.fixtures.world('clock-behavior')) as World;
      const sut = h.sut.notifications as NotificationsSut;

      await h.clock.freezeAt('2026-07-01T00:00:00.000Z');
      await world.burstThreadComments(cap + 3);
      await sut.drainDeliveries();
      expect(
        await sut.deliveries({ type: 'thread.comment' }),
        'the window guard did not cap the burst at the configured value',
      ).toHaveLength(cap);

      // The only thing that changes here is the harness clock. If the guard read wall-clock time
      // instead, nothing would reset and the count would stay at the cap.
      await h.clock.advance(windowMs + 1);
      await world.burstThreadComments(1);
      await sut.drainDeliveries();
      expect(
        await sut.deliveries({ type: 'thread.comment' }),
        'advancing the harness clock past the window did not reopen the guard — the product is not reading it',
      ).toHaveLength(cap + 1);
    } finally {
      await h.teardown();
    }
  });
});
