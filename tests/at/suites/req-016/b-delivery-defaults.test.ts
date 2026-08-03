/**
 * AT-REQ-016 · B. Delivery defaults — AT-016.07 .. AT-016.08
 * Source: .taskmaster/docs/acceptance/at-req-016.md
 *
 * Every pinned number in this file comes from the at-config registry (AI4DEV-3 Part B).
 * Nothing here hard-codes a cap, a window, or a threshold.
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { countPairs } from './_oracles.ts';

/** The at-config keys the thread-comment anti-spam guard is configured by (AT-016.08). */
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

      // The restart is only "mid-flight" if the event is durable AND nothing has been delivered
      // yet. If `fire()` already ran delivery to completion, restarting afterwards exercises
      // nothing and this test would pass on a no-op — so that state is a RED, not a pass.
      const committed = (await sut.events({ type: 'payment.succeeded' })).find((e) => e.id === eventId);
      expect(committed, 'the committed event was never written').toBeDefined();
      expect(
        (await sut.deliveries({ type: 'payment.succeeded' })).filter((d) => d.eventId === eventId && d.state === 'sent'),
        'delivery already completed before the restart — the restart is not mid-flight and proves nothing',
      ).toEqual([]);

      // That the restart actually changed the delivery process's identity is the harness's
      // obligation, checked once in harness/guards.ts (processEpochProblem), not per suite.
      const beforeRestart = await h.faults.processEpoch();
      await h.faults.processRestart();
      const afterRestart = await h.faults.processEpoch();

      await sut.drainDeliveries();

      // THE RESTART IS PART OF THIS RESULT, not a step beside it. Every delivery of this event was
      // still pending above, so all of them had to be completed by the process that exists AFTER
      // the restart — and the delivery path has to read that identity to say so. Before this
      // assertion, `processRestart()` changed a label nothing on the delivery path consulted, and
      // deleting the restart call left this test passing identically; now a process identity the
      // delivery path ignores fails here instead of passing.
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

      // An email + in-app row legitimately yields two deliveries — one per channel, never per pair.
      const required = logical[0].recipients
        .flatMap((r) => r.channels.map((c) => `${r.recipientId}:${c}`))
        .sort();
      expect(required.length, 'the event resolved no recipient-channel pairs at all').toBeGreaterThan(0);
      expect([...perPair.keys()].sort(), 'delivered pairs do not match the pairs resolved on the event').toEqual(required);
    },
  );

  atTest(
    'AT-016.08',
    'a comment burst delivers the count the pinned anti-spam configuration prescribes, on two different configurations',
    async ({ open }) => {
      // TWO materially different configurations, driven through the SAME body. One configuration
      // is not a test of "conforms to configuration": an implementation that hard-codes the
      // registry's own defaults satisfies a single-variant run exactly as well as one that reads
      // its configuration, and the pair is what tells them apart. Variant B changes the cap, the
      // window AND the coalescing switch, so no single hard-coded behaviour can satisfy both.
      const variants = [
        { name: 'registry defaults', overrides: undefined },
        {
          name: 'coalescing, wider window, higher cap',
          overrides: { [GUARD_CAP_KEY]: 4, [GUARD_WINDOW_KEY]: 120_000, [GUARD_COALESCE_KEY]: true },
        },
      ] as const;

      const observed: { name: string; delivered: number }[] = [];

      for (const variant of variants) {
        // A world of its own per variant: the guard's window state is what is under test, so it
        // must start from nothing, and its configuration is fixed when the world is opened.
        const { h, w, sut } = await open(undefined, variant.overrides ? { config: variant.overrides } : undefined);

        // Read back from THIS world's registry — the values the guard is actually running on,
        // never a copy the test kept.
        const cap = h.config.get<number>(GUARD_CAP_KEY);
        const windowMs = h.config.get<number>(GUARD_WINDOW_KEY);
        const coalesce = h.config.get<boolean>(GUARD_COALESCE_KEY);

        const burst = cap + 5;
        const expectedDelivered = coalesce ? 1 : cap;
        const where = `${variant.name} (cap=${cap}, window=${windowMs}ms, coalesce=${coalesce})`;

        // The oracle must discriminate: a no-op guard would deliver one per comment.
        expect(expectedDelivered, `${where} describes a no-op guard for a burst of ${burst}`).toBeLessThan(burst);

        const pair = `${w.actors.volunteer}:inapp`;
        await h.clock.freezeAt('2026-07-01T00:00:00.000Z');
        await w.burstThreadComments(burst);
        await h.clock.advance(Math.floor(windowMs / 2)); // still inside the pinned window
        await sut.drainDeliveries();

        const insideWindow = countPairs(await sut.deliveries({ type: 'thread.comment' })).get(pair) ?? 0;
        expect(
          insideWindow,
          `${where}: burst of ${burst} inside the window delivered ${insideWindow}; the configuration prescribes ${expectedDelivered}`,
        ).toBe(expectedDelivered);

        // The other side of the boundary: past the window the guard resets, so one more comment
        // delivers again. A guard that simply stopped after the first N — ignoring time entirely —
        // fails here, and so does a guard that never reads the controlled clock.
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

      // The two configurations must be observably different, otherwise "it honoured the
      // configuration" was never actually put to the test.
      expect(
        new Set(observed.map((entry) => entry.delivered)).size,
        `the two configurations produced the same delivered count (${JSON.stringify(observed)}) — ` +
          `an implementation ignoring its configuration would pass this test`,
      ).toBe(variants.length);
    },
  );
});
