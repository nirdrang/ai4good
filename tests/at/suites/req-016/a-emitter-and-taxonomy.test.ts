import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { assertEmitterIsSoleWriter, at01601 } from './_integration.ts';
import { taxonomySeedProblems } from './_source-scan.ts';
import { FORBIDDEN_EVENT_PATTERNS, TAXONOMY } from './taxonomy.ts';

describe('AT-REQ-016 A — single writer & static taxonomy', () => {
  atTest('AT-016.01', 'the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path', {
    default: async ({ atId, open }) => {
      const { h, w, sut } = await open();
      await assertEmitterIsSoleWriter(atId, sut, w, h.sentinels);

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

      expect(taxonomySeedProblems(), 'the migration seed and the product taxonomy disagree').toEqual([]);

      for (const pattern of FORBIDDEN_EVENT_PATTERNS) {
        expect(registered.filter((e) => pattern.test(e)), `forbidden event matching ${pattern}`).toEqual([]);
      }

      const beforeDeliveries = (await sut.deliveries()).length;
      const beforeEvents = (await sut.events()).length;
      const result = await sut.emit({ type: 'at-016.02.sentinel.unregistered' });
      expect(result.accepted, 'an unregistered event type was accepted').toBe(false);
      expect(result.eventId, 'a rejected emit still minted an event id').toBeUndefined();
      await sut.drainDeliveries();
      expect((await sut.deliveries()).length, 'a rejected event still produced a delivery').toBe(beforeDeliveries);
      expect((await sut.events()).length, 'a rejected event was still written').toBe(beforeEvents);

      expect(await sut.runtimeRegistrationSurface(), 'the taxonomy is mutable at runtime').toEqual([]);
    },
  );
});
