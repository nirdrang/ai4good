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

describe('AT-REQ-016 B — delivery defaults', () => {
  atTest(
    'AT-016.07',
    'one logical event per committed event, one delivery per recipient-channel pair, across a restart',
    async ({ open }) => {
      const { h, w, sut } = await open();

      const epochBefore = await h.faults.processEpoch();
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

      await h.faults.processRestart();
      expect(
        await h.faults.processEpoch(),
        'the delivery process identity did not change — processRestart() restarted nothing',
      ).not.toBe(epochBefore);

      await sut.drainDeliveries();

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
    'a comment burst delivers the count the pinned anti-spam configuration prescribes',
    async ({ open }) => {
      const { h, w, sut } = await open();

      const cap = h.config.get<number>('req-015.thread_comment_notifications.max_per_window');
      const windowMs = h.config.get<number>('req-015.thread_comment_notifications.window_ms');
      const coalesce = h.config.get<boolean>('req-015.thread_comment_notifications.coalesce');

      const burst = cap + 5;
      const expectedDelivered = coalesce ? 1 : cap;

      // The oracle must discriminate: a no-op guard would deliver one per comment.
      expect(
        expectedDelivered,
        `the pinned configuration (cap=${cap}, coalesce=${coalesce}) describes a no-op guard for a burst of ${burst}`,
      ).toBeLessThan(burst);

      // The clock must be the PRODUCT's clock, not just the test's. A frozen harness clock that
      // the notification worker ignores would make every window assertion below meaningless.
      const t0 = '2026-07-01T00:00:00.000Z';
      await h.clock.freezeAt(t0);
      expect(
        Date.parse(await h.clock.observedByProduct()),
        'the product does not read the controlled clock — freezeAt() moved only the test',
      ).toBe(Date.parse(t0));

      const pair = `${w.actors.volunteer}:inapp`;
      await w.burstThreadComments(burst);
      await h.clock.advance(Math.floor(windowMs / 2)); // still inside the pinned window
      expect(
        Date.parse(await h.clock.observedByProduct()) - Date.parse(t0),
        'the product clock did not advance with the harness clock',
      ).toBe(Math.floor(windowMs / 2));
      await sut.drainDeliveries();

      const insideWindow = countPairs(await sut.deliveries({ type: 'thread.comment' })).get(pair) ?? 0;
      expect(
        insideWindow,
        `burst of ${burst} inside a ${windowMs}ms window delivered ${insideWindow}; configuration prescribes ${expectedDelivered}`,
      ).toBe(expectedDelivered);

      // The other side of the boundary: past the window the guard resets, so one more comment
      // delivers again. A guard that simply stopped after the first N — ignoring time entirely —
      // fails here, and so does a clock the guard never reads.
      await h.clock.advance(windowMs);
      await w.burstThreadComments(1);
      await sut.drainDeliveries();

      const afterWindow = countPairs(await sut.deliveries({ type: 'thread.comment' })).get(pair) ?? 0;
      expect(
        afterWindow,
        `a comment ${windowMs}ms after the window still suppressed: total ${afterWindow}, expected ${expectedDelivered + 1}`,
      ).toBe(expectedDelivered + 1);
    },
  );
});
