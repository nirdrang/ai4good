import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { at01608 } from './_integration.ts';
import { countPairs } from './_oracles.ts';

const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';
const GUARD_COALESCE_KEY = 'req-015.thread_comment_notifications.coalesce';

describe('AT-REQ-016 B — delivery defaults', () => {
  atTest(
    'AT-016.07',
    'one logical event per committed event, one delivery per recipient-channel pair, across a restart',
    async ({ open }) => {
      const { h, w, sut } = await open();

      const { eventId } = await w.fire('payment.succeeded');

      const committed = (await sut.events({ type: 'payment.succeeded' })).find((e) => e.id === eventId);
      expect(committed, 'the committed event was never written').toBeDefined();
      expect(
        (await sut.deliveries({ type: 'payment.succeeded' })).filter((d) => d.eventId === eventId && d.state === 'sent'),
        'delivery already completed before the restart — the restart is not mid-flight and proves nothing',
      ).toEqual([]);

      const beforeRestart = await h.faults.processEpoch();
      await h.faults.processRestart();
      const afterRestart = await h.faults.processEpoch();
      expect(
        afterRestart,
        'the delivery-process identity is unchanged across the restart — this scenario never ' +
          'actually restarted, so every claim below would be about a process that never stopped',
      ).not.toBe(beforeRestart);

      await sut.drainDeliveries();

      const stamps = (await sut.deliveries({ type: 'payment.succeeded' }))
        .filter((d) => d.eventId === eventId)
        .map((d) => d.deliveredByProcess);
      expect(stamps.length, 'the event produced no delivery to attribute to any process').toBeGreaterThan(0);
      expect(
        [...new Set(stamps)],
        `pending work was not completed by the post-restart delivery process (before=${beforeRestart}, after=${afterRestart})`,
      ).toEqual([afterRestart]);

      const logical = (await sut.events({ type: 'payment.succeeded' })).filter((e) => e.id === eventId);
      expect(logical.length, 'the committed event yielded more or fewer than one logical notification').toBe(1);

      const deliveries = (await sut.deliveries({ type: 'payment.succeeded' })).filter((d) => d.eventId === eventId);
      const perPair = countPairs(deliveries);

      const duplicated = [...perPair.entries()].filter(([, n]) => n !== 1);
      expect(duplicated, 'a recipient-channel pair received more than one delivery').toEqual([]);

      const required = logical[0].recipients
        .flatMap((r) => r.channels.map((c) => `${r.recipientId}:${c}`))
        .sort();
      expect(required.length, 'the event resolved no recipient-channel pairs at all').toBeGreaterThan(0);
      expect([...perPair.keys()].sort(), 'delivered pairs do not match the pairs resolved on the event').toEqual(required);
    },
  );

  atTest('AT-016.08', 'a comment burst delivers the count the pinned anti-spam configuration prescribes, on two different configurations', {
    timeoutMs: { integration: 60_000 },
  }, {
    integration: at01608,
    default: async ({ open }) => {
      const variants = [
        { name: 'registry defaults', overrides: undefined },
        {
          name: 'coalescing, wider window, higher cap',
          overrides: { [GUARD_CAP_KEY]: 4, [GUARD_WINDOW_KEY]: 120_000, [GUARD_COALESCE_KEY]: true },
        },
      ] as const;

      const observed: { name: string; delivered: number }[] = [];

      for (const variant of variants) {
        const { h, w, sut } = await open(undefined, variant.overrides ? { config: variant.overrides } : undefined);

        const cap = h.config.get<number>(GUARD_CAP_KEY);
        const windowMs = h.config.get<number>(GUARD_WINDOW_KEY);
        const coalesce = h.config.get<boolean>(GUARD_COALESCE_KEY);

        const burst = cap + 5;
        const expectedDelivered = coalesce ? 1 : cap;
        const where = `${variant.name} (cap=${cap}, window=${windowMs}ms, coalesce=${coalesce})`;

        expect(expectedDelivered, `${where} describes a no-op guard for a burst of ${burst}`).toBeLessThan(burst);

        const pair = `${w.actors.volunteer}:inapp`;
        await h.clock.freezeAt('2026-07-01T00:00:00.000Z');
        await w.burstThreadComments(burst);
        await h.clock.advance(Math.floor(windowMs / 2));
        await sut.drainDeliveries();

        const insideWindow = countPairs(await sut.deliveries({ type: 'thread.comment' })).get(pair) ?? 0;
        expect(
          insideWindow,
          `${where}: burst of ${burst} inside the window delivered ${insideWindow}; the configuration prescribes ${expectedDelivered}`,
        ).toBe(expectedDelivered);

        await h.clock.advance(windowMs);
        await w.burstThreadComments(1);
        await sut.drainDeliveries();

        const afterWindow = countPairs(await sut.deliveries({ type: 'thread.comment' })).get(pair) ?? 0;
        expect(
          afterWindow,
          `${where}: a comment ${windowMs}ms after the window was still suppressed — total ${afterWindow}, expected ${expectedDelivered + 1}`,
        ).toBe(expectedDelivered + 1);

        observed.push({ name: variant.name, delivered: insideWindow });
      }

      expect(
        new Set(observed.map((entry) => entry.delivered)).size,
        `the two configurations produced the same delivered count (${JSON.stringify(observed)}) — ` +
          `an implementation ignoring its configuration would pass this test`,
      ).toBe(variants.length);
    },
  });
});
