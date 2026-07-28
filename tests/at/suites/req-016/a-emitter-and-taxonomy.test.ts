/**
 * AT-REQ-016 · A. Single writer & static taxonomy — AT-016.01 .. AT-016.04
 * Source: .taskmaster/docs/acceptance/at-req-016.md
 *
 * TAGGING: every test is registered through `atTest('AT-016.NN', …)`. That call site is the
 * single declaration of the id — the title, the failure stamp and the per-id report all derive
 * from it, and `atTest` fails any body that asserts nothing. Parameterized rows loop INSIDE one
 * test so a row explosion never mints extra claims on an id.
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { countPairs, expectedPairs, pairProblems } from './_oracles.ts';
import {
  channelRuleProblems,
  FORBIDDEN_EVENT_PATTERNS,
  PAYLOAD_PREDICATES,
  PENALTY_LEXICON,
  TAXONOMY,
} from './taxonomy.ts';

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

      // (3) a sentinel raised in each domain must reach recipients, and only via the emitter
      const seen = new Set<string>();
      for (const p of DOMAIN_PROBES) {
        const sentinel = await h.sentinels.plant('notification-body', `${atId}/${p.domain}/${Date.now()}`);
        // A blank or reused sentinel makes `body.includes(value)` true for every body.
        expect(sentinel.value.length, 'the planted sentinel is too short to be discriminating').toBeGreaterThan(15);
        expect(seen.has(sentinel.value), 'the same sentinel value was planted twice').toBe(false);
        seen.add(sentinel.value);
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

  atTest(
    'AT-016.03',
    'every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads',
    async ({ open }) => {
      const { w, sut } = await open();

      const documented = new Map((await sut.documentedDefaults()).map((d) => [d.event, d.channels]));
      const problems: string[] = [];

      for (const row of TAXONOMY) {
        // Baseline: a fixture preloaded with the expected rows would otherwise let `fire()`
        // do nothing while every recipient/channel/payload assertion below still passed.
        const baseline = await sut.deliveries({ type: row.event });
        if (baseline.length > 0) {
          problems.push(`${row.event}: ${baseline.length} deliveries existed BEFORE the event fired`);
          continue;
        }

        const { eventId } = await w.fire(row.event);
        await sut.drainDeliveries();
        // Attribute strictly to the event this action created.
        const deliveries = (await sut.deliveries({ type: row.event })).filter((d) => d.eventId === eventId);

        // Channels: named by the row, else bound to the DOCUMENTED default (AT-016.06's matrix).
        const channels = row.channels ?? documented.get(row.event);
        if (!channels || channels.length === 0) {
          problems.push(`${row.event}: channels unnamed and no documented default to bind to`);
          continue;
        }
        // …and the bound channels must still satisfy the requirement's own class rule, so an
        // implementation cannot document its way out of "critical events go by email".
        problems.push(...channelRuleProblems(row, channels).map((p) => `${row.event}: ${p}`));

        // Exactly one delivery per expected recipient-channel pair; no extra recipient of the
        // same role, no duplicate — counted, not de-duplicated.
        const want = expectedPairs(w.actors, row.recipients, channels);
        problems.push(...pairProblems(want, countPairs(deliveries)).map((p) => `${row.event}: ${p}`));

        const predicates = PAYLOAD_PREDICATES[row.event] ?? {};
        for (const key of row.payloadKeys ?? []) {
          if (deliveries.length === 0) {
            problems.push(`${row.event}: payload key "${key}" unverifiable — no deliveries`);
            continue;
          }
          const predicate = predicates[key];
          for (const d of deliveries) {
            const failure = predicate
              ? predicate(d.payload[key], d.body)
              : String(d.payload[key] ?? '').trim()
                ? null
                : 'missing';
            if (failure) problems.push(`${row.event} → ${d.role}: payload "${key}" ${failure}`);
          }
        }

        if (row.opsItem) {
          const items = await sut.opsItems({ linkedEventId: eventId });
          if (items.length !== 1) problems.push(`${row.event}: expected exactly 1 linked ops item, got ${items.length}`);
        }
      }

      // Called out explicitly: depleted fuel adds the admin escalation on top of NGO + volunteer.
      const depleted = await sut.deliveries({ type: 'fuel.depleted' });
      const depletedRoles = [...new Set(depleted.map((d) => d.role))].sort();
      if (depletedRoles.join(',') !== 'ngo,platform_admin,volunteer') {
        problems.push(`fuel.depleted: roles ${JSON.stringify(depletedRoles)} — admin escalation missing alongside NGO+volunteer`);
      }

      // Called out explicitly: the auto-revert copy instructs, it never penalises.
      const reverts = await sut.deliveries({ type: 'pm_item.status_auto_reverted' });
      if (reverts.length === 0) problems.push('pm_item.status_auto_reverted: no delivery to inspect for penalty language');
      for (const d of reverts) {
        const body = d.body.toLowerCase();
        const hits = PENALTY_LEXICON.filter((term) => body.includes(term));
        if (hits.length) problems.push(`pm_item.status_auto_reverted: penalty language ${JSON.stringify(hits)} in the copy`);
      }

      expect(problems, `taxonomy rows that did not deliver as specified (${problems.length} problems / ${TAXONOMY.length} rows)`).toEqual([]);
    },
  );

  atTest(
    'AT-016.04',
    'sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event',
    async ({ open }) => {
      const { w, sut } = await open();

      for (const event of ['candidacy.marked', 'match.declined_or_expired']) {
        const { eventId } = await w.fire(event);
        await sut.drainDeliveries();
        const delivered = (await sut.deliveries({ type: event })).filter((d) => d.eventId === eventId);
        expect(delivered.length, `${event} produced no delivery at all — the probe is not discriminating`).toBeGreaterThan(0);
        expect(
          delivered.filter((d) => d.role === 'ngo' || d.recipientId === w.actors.ngo),
          `${event} leaked to the NGO — match-log events are admin-only`,
        ).toEqual([]);
      }

      const vetting = await w.fire('vetting.outcome');
      await sut.drainDeliveries();
      const vettingDeliveries = (await sut.deliveries({ type: 'vetting.outcome' })).filter((d) => d.eventId === vetting.eventId);
      expect(vettingDeliveries.length, 'vetting.outcome produced no delivery at all').toBeGreaterThan(0);
      expect(
        vettingDeliveries.filter((d) => d.role === 'volunteer' || d.recipientId === w.actors.volunteer),
        "the NGO's vetting outcome leaked to the volunteer",
      ).toEqual([]);

      const registered = (await sut.taxonomy()).map((r) => r.event);
      expect(registered.filter((e) => /donat/i.test(e)), 'a donation event exists').toEqual([]);
      const leftoverEvent = await w.fire('leftover.released');
      await sut.drainDeliveries();
      const leftover = (await sut.deliveries({ type: 'leftover.released' })).filter((d) => d.eventId === leftoverEvent.eventId);
      expect(leftover.length, 'leftover release produced no delivery at all').toBeGreaterThan(0);
      expect(leftover.filter((d) => /donat/i.test(d.body)), 'leftover release was framed as a donation').toEqual([]);
    },
  );
});
