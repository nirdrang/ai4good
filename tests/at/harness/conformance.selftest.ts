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

import { createFaults } from './faults.ts';
import { createFixtureSeed, FixtureWorldStore, LIFECYCLE_STATES } from './fixtures.ts';
import { bijectionProblems, type SuiteRegistration } from './check.ts';
import { createHarness, liveAdapterExists } from './index.ts';
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
  aboveLoopStandInRefusal,
  atTest,
  CapabilityPending,
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

  it('refuses to grade a stand-in above the loop tier, by name', () => {
    const refusal = aboveLoopStandInRefusal('integration', false, 'notifications');
    expect(refusal).toBeInstanceOf(CapabilityPending);
    expect(refusal!.capabilities).toEqual(['fixtures.worlds', 'sut.notifications']);
    expect(refusal!.message).toBe('CAPABILITY PENDING — fixtures.worlds, sut.notifications');
    expect(aboveLoopStandInRefusal('integration', true, 'accounts')).toBeNull();
    expect(aboveLoopStandInRefusal('loop', false, 'accounts')).toBeNull();
  });

  it('decides liveness before anything is built, and createHarness above loop with no live adapter throws', async () => {
    expect(liveAdapterExists('req-016')).toBe(false);
    expect(liveAdapterExists('req-001')).toBe(true);

    await expect(createHarness({ requirement: 'req-016', tier: 'integration' })).rejects.toThrow(
      /no live adapter for req-016; the registry refuses this tier before construction/,
    );

    // Four dummy coordinates, no mail URL: the live branch is reached and the mail reader
    // refuses. After the name-map item, stackFromEnv would otherwise throw first.
    const names = ['AT_SUPABASE_URL', 'AT_SUPABASE_DB_URL', 'AT_SUPABASE_ANON_KEY', 'AT_SUPABASE_SERVICE_ROLE_KEY', 'AT_SUPABASE_MAIL_URL'] as const;
    const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    process.env.AT_SUPABASE_URL = 'http://127.0.0.1:9';
    process.env.AT_SUPABASE_DB_URL = 'postgresql://127.0.0.1:9/postgres';
    process.env.AT_SUPABASE_ANON_KEY = 'anon';
    process.env.AT_SUPABASE_SERVICE_ROLE_KEY = 'service';
    delete process.env.AT_SUPABASE_MAIL_URL;
    try {
      await expect(createHarness({ requirement: 'req-001', tier: 'integration' })).rejects.toThrow(/mail catcher/);
    } finally {
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }

    const loop = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      expect(loop.tier).toBe('loop');
      expect(loop.sut.notifications).toBeDefined();
    } finally {
      await loop.teardown();
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
