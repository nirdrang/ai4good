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

const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';

const FAULT_POINT = 'notifications.between_transition_and_event_write';
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

    expect(() =>
      atTest('AT-017.03', 'bound to the wrong suite', { requirement: 'req-016', sut: 'notifications' }, async () => undefined),
    ).toThrow(/req-017/);

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
    expect(liveAdapterExists('req-999')).toBe(false);
    expect(liveAdapterExists('req-001')).toBe(true);
    expect(liveAdapterExists('req-016')).toBe(true);

    await expect(createHarness({ requirement: 'req-999', tier: 'integration' })).rejects.toThrow(
      /no live adapter for req-999; the registry refuses this tier before construction/,
    );

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

describe('the H3 wall: sentinels and fault injection call the guards, and refuse', () => {
  it('plants a usable marker and refuses a blank, a short, a reused and an overlapping value', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const value = 'conformance/plant/1767225600000';
      const sentinel = await h.sentinels.plant('notification-body', value);
      expect(sentinel.value, 'plant() did not hand back the value it was asked to plant').toBe(value);
      expect(sentinel.id.length, 'the sentinel carries no id, so two plantings are indistinguishable').toBeGreaterThan(0);

      await expect(h.sentinels.plant('notification-body', 'short')).rejects.toThrow(/characters/);
      await expect(h.sentinels.plant('notification-body', '   ')).rejects.toThrow(/non-empty/);
      await expect(h.sentinels.plant('notification-body', value)).rejects.toThrow(/planted before/);

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

      await expect(world.fire('payment.succeeded'), 'the induced crash did not surface at all').rejects.toThrow(
        /induced fault/,
      );
      expect(await first.triggerCount(), 'the arming that survived did not count the fault it caught').toBe(1);
      await first.clear();

      const second = await h.faults.at(FAULT_POINT, 'crash');
      await expect(world.fire('payment.succeeded')).rejects.toThrow(/induced fault/);
      await second.clear();

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
    const noFaults = createFaults();
    expect(await noFaults.points()).toEqual([]);
    await expect(noFaults.at(FAULT_POINT, 'crash')).rejects.toThrow(/Exposed points: \(none\)/);
    await expect(noFaults.processRestart()).rejects.toThrow(/empty epoch/);

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
