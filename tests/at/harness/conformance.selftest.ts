import { describe, expect, it } from 'vitest';

import { standInCapability, stubbedCapabilityNames } from './capabilities.ts';
import { ControlledClock } from './clock.ts';
import { createFixtureSeed, FixtureWorldStore, LIFECYCLE_STATES } from './fixtures.ts';
import { bijectionProblems, type SuiteRegistration } from './check.ts';
import { analyzeReportedTests, type AssertionResult, type RuntimeRegistration } from './runner.ts';
import { captureProducerProblem, executeRegisteredBody, freezeEvidence, testUseProblem } from './registry.ts';
import { createFixtureAdapter } from '../suites/req-016/_fixture.ts';
import type { NotificationsSut, World } from '../suites/req-016/_contract.ts';

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

  it('makes product behavior read the same controlled clock', async () => {
    const clock = new ControlledClock();
    const worlds = new FixtureWorldStore(createFixtureSeed());
    const adapter = createFixtureAdapter({ clock, worlds });
    const world = (await adapter.fixtures.world('clock-behavior')) as World;
    const sut = adapter.sut.notifications as NotificationsSut;

    await clock.freezeAt('2026-07-01T00:00:00.000Z');
    await world.burstThreadComments(5);
    await sut.drainDeliveries();
    expect(await sut.deliveries({ type: 'thread.comment' })).toHaveLength(2);

    await clock.advance(60_001);
    await world.burstThreadComments(1);
    await sut.drainDeliveries();
    expect(await sut.deliveries({ type: 'thread.comment' })).toHaveLength(3);
    expect(await clock.observedByProduct()).toBe('2026-07-01T00:01:00.001Z');

    await adapter.teardown();
    await worlds.teardown();
  });
});
