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

import { standInCapability, stubbedCapabilityNames } from './capabilities.ts';
import { createFixtureSeed, FixtureWorldStore, LIFECYCLE_STATES } from './fixtures.ts';
import { bijectionProblems, type SuiteRegistration } from './check.ts';
import { createHarness } from './index.ts';
import {
  faultFiredProblem,
  faultPointProblem,
  MIN_SENTINEL_VALUE_LENGTH,
  processEpochProblem,
  sentinelValueProblem,
} from './guards.ts';
import { analyzeReportedTests, type AssertionResult, type RuntimeRegistration } from './runner.ts';
import {
  captureProducerProblem,
  drainTeardowns,
  executeRegisteredBody,
  freezeEvidence,
  runTrackedTest,
  testUseProblem,
  type TrackedTeardown,
} from './registry.ts';
import type { NotificationsSut, World } from '../suites/req-016/_contract.ts';

/** The guard configuration AT-016.08 drives, addressed the way a suite addresses it. */
const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';

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

  it('derives stand-in provenance from the factory wrapper, not capability self-report', () => {
    const dishonest = standInCapability('fixtures.worlds', {
      stubbedCapabilities: () => [],
    });
    expect(stubbedCapabilityNames([dishonest])).toEqual(['fixtures.worlds']);
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
  it('accepts a long unique sentinel and refuses a short one, a blank one and a reused one', () => {
    const good = 'AT-016.01/blockers/1767225600000';
    expect(good.length).toBeGreaterThanOrEqual(MIN_SENTINEL_VALUE_LENGTH);
    expect(sentinelValueProblem(good, [])).toBeNull();
    expect(sentinelValueProblem('short', [])).toContain('characters');
    expect(sentinelValueProblem('   ', [])).toContain('non-empty');
    expect(sentinelValueProblem(good, [good])).toContain('planted before');
  });

  it('accepts a fault point the product exposes and refuses one it does not', () => {
    const exposed = ['notifications.between_transition_and_event_write'];
    expect(faultPointProblem(exposed[0], exposed)).toBeNull();
    const problem = faultPointProblem('notifications.typo', exposed) ?? '';
    expect(problem).toContain('exposes no fault point');
    expect(problem, 'the refusal does not say which points DO exist, so a typo is hard to see').toContain(exposed[0]);
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
