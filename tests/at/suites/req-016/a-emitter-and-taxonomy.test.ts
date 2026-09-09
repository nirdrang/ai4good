/**
 * AT-REQ-016 · A. Single writer & static taxonomy — AT-016.01 .. AT-016.02
 * Source: .taskmaster/docs/acceptance/at-req-016.md
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { assertEmitterIsSoleWriter, at01601 } from './_integration.ts';
import { taxonomySeedProblems } from './_source-scan.ts';
import { FORBIDDEN_EVENT_PATTERNS, TAXONOMY } from './taxonomy.ts';

describe('AT-REQ-016 A — single writer & static taxonomy', () => {
  atTest('AT-016.01', 'the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path', {
    // The source oracles, the self-report and the per-domain sentinels are one procedure at both
    // tiers (`_integration.ts`). What forks is the provider-side trace: the simulator's here, the
    // mail catcher's above loop.
    default: async ({ atId, open }) => {
      const { h, w, sut } = await open();
      await assertEmitterIsSoleWriter(atId, sut, w, h.sentinels);

      // (4) provider-side trace: every send that reached the provider belongs to an emitter event
      const emitterEventIds = new Set((await sut.events()).map((e) => e.id));
      const orphaned = h.vendors.email.attempts().filter((a) => !emitterEventIds.has(a.eventId));
      expect(orphaned, 'a send reached the provider without a corresponding emitter event').toEqual([]);
    },
    integration: at01601,
  });

  atTest(
    'AT-016.02',
    'registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event',
    async ({ open }) => {
      const { sut } = await open();

      const registered = (await sut.taxonomy()).map((r) => r.event);
      const specified = TAXONOMY.map((r) => r.event);
      const extra = registered.filter((e) => !specified.includes(e)).sort();
      const missing = specified.filter((e) => !registered.includes(e)).sort();
      expect(extra, 'events registered that the requirement does not define').toEqual([]);
      expect(missing, 'taxonomy rows the implementation never registered (incl. the d81 PRD-gate + money-corrections rows)').toEqual([]);
      expect(registered.length, 'the same event registered twice').toBe(new Set(registered).size);

      // The closed set exists twice by design, as the product's decision table and as the
      // database's seed. The source oracle proves the two name the same events.
      expect(taxonomySeedProblems(), 'the migration seed and the product taxonomy disagree').toEqual([]);

      // No dedicated scope-change / change-request / donation event exists in v1.
      for (const pattern of FORBIDDEN_EVENT_PATTERNS) {
        expect(registered.filter((e) => pattern.test(e)), `forbidden event matching ${pattern}`).toEqual([]);
      }

      // A type outside the taxonomy is rejected, no event is written and nothing is sent.
      const beforeDeliveries = (await sut.deliveries()).length;
      const beforeEvents = (await sut.events()).length;
      const result = await sut.emit({ type: 'at-016.02.sentinel.unregistered' });
      expect(result.accepted, 'an unregistered event type was accepted').toBe(false);
      expect(result.eventId, 'a rejected emit still minted an event id').toBeUndefined();
      await sut.drainDeliveries();
      expect((await sut.deliveries()).length, 'a rejected event still produced a delivery').toBe(beforeDeliveries);
      expect((await sut.events()).length, 'a rejected event was still written').toBe(beforeEvents);

      // Closed set: no runtime registration/mutation path exists at all.
      expect(await sut.runtimeRegistrationSurface(), 'the taxonomy is mutable at runtime').toEqual([]);
    },
  );
});
