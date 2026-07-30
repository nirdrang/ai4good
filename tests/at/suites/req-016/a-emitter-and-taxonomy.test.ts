/**
 * AT-REQ-016 · A. Single writer & static taxonomy — AT-016.01 .. AT-016.02
 * Source: .taskmaster/docs/acceptance/at-req-016.md
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { FORBIDDEN_EVENT_PATTERNS, TAXONOMY } from './taxonomy.ts';

/** The three domains REQ-016 says never send comms directly. */
const DOMAIN_PROBES = [
  { domain: 'blockers', component: 'blockers.service', event: 'blocker.raised' },
  { domain: 'scope_additions', component: 'scope.service', event: 'thread.comment' },
  { domain: 'lifecycle', component: 'lifecycle.service', event: 'pm_item.status_changed' },
] as const;

describe('AT-REQ-016 A — single writer & static taxonomy', () => {
  atTest(
    'AT-016.01',
    'the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path',
    async ({ atId, open }) => {
      const { h, w, sut } = await open();

      // (1) OUT-OF-BAND first. `senders()` and `Delivery.emittedBy` are both produced by the
      // component under test: a rogue direct sender can omit itself and stamp the emitter's
      // name. The source-level scan is the witness that is not the subject.
      expect(
        (await h.static.providerClientImporters()).sort(),
        'a component other than the emitter imports a comms-provider client or holds its credential',
      ).toEqual(['notifications.emitter']);

      // (2) the architecture's own self-report must agree with the scan
      const senders = await sut.senders();
      expect(
        senders.filter((s) => s.canSendDirectly).map((s) => s.component).sort(),
        'more than one component holds send capability',
      ).toEqual(['notifications.emitter']);

      // The probe must actually SEE the three domains, otherwise the assertion above is vacuous.
      for (const p of DOMAIN_PROBES) {
        const probe = senders.find((s) => s.component === p.component);
        expect(probe, `${p.domain} absent from the sender probe — the probe is not discriminating`).toBeDefined();
        expect(probe!.canSendDirectly, `${p.domain} holds a direct send path`).toBe(false);
      }

      // (3) a sentinel raised in each domain must reach recipients, and only via the emitter.
      // That each planted value is long enough to discriminate and has never been planted before
      // is the harness's obligation, checked once in harness/guards.ts (sentinelValueProblem).
      for (const p of DOMAIN_PROBES) {
        const sentinel = await h.sentinels.plant('notification-body', `${atId}/${p.domain}/${Date.now()}`);
        expect(
          (await sut.deliveries()).filter((d) => d.body.includes(sentinel.value)),
          `${p.domain} sentinel was already present before the domain fired — absence baseline broken`,
        ).toEqual([]);

        const { eventId } = await w.fire(p.event, { sentinel: sentinel.value });
        await sut.drainDeliveries();

        const carrying = (await sut.deliveries({ type: p.event })).filter(
          (d) => d.eventId === eventId && d.body.includes(sentinel.value),
        );
        expect(carrying.length, `${p.domain} sentinel never reached a recipient`).toBeGreaterThan(0);
        expect(
          [...new Set(carrying.map((d) => d.emittedBy))],
          `${p.domain} notification took a path around the emitter`,
        ).toEqual(['notifications.emitter']);
      }

      // (4) provider-side trace: every send that reached the provider belongs to an emitter event
      const emitterEventIds = new Set((await sut.events()).map((e) => e.id));
      const orphaned = h.vendors.email.attempts().filter((a) => !emitterEventIds.has(a.eventId));
      expect(orphaned, 'a send reached the provider without a corresponding emitter event').toEqual([]);
    },
  );

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
