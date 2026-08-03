import { describe, expect } from 'vitest';
import { atTest, defineEvidenceCapture } from './_bind.ts';
import type { Delivery, DocumentedDefault, NotificationEvent, NotificationsSut, OpsItem, World } from './_contract.ts';
import { countPairs, expectedPairs, pairProblems } from './_oracles.ts';
import {
  channelRuleProblems,
  CRITICAL_CLASS_FIXTURES,
  LOW_TONE_FIXTURE,
  PAYLOAD_PREDICATES,
  PENALTY_LEXICON,
  TAXONOMY,
} from './taxonomy.ts';

interface RowEvidence {
  eventId: string;
  before: Delivery[];
  events: NotificationEvent[];
  deliveries: Delivery[];
  opsItems: OpsItem[];
}

interface TaxonomyEvidence {
  actors: World['actors'];
  registered: string[];
  defaults: DocumentedDefault[];
  rows: Record<string, RowEvidence>;
}

let evidenceBuilds = 0;

// The BOUND helper from `_bind.ts`, not the raw generic. The raw one took the system-under-test and
// world types as arguments, so a capture could declare a seam nothing supplies and read it green —
// the same defect `bindSuite` used to have, one import along. Only `TaxonomyEvidence` is named here,
// and that is this file's own captured shape, not a claim about the harness.
const taxonomyEvidence = defineEvidenceCapture<TaxonomyEvidence>(
  'REQ-016 taxonomy execution',
  async ({ open }) => {
    evidenceBuilds += 1;
    const { w, sut } = await open();
    const rows: Record<string, RowEvidence> = {};

    for (const row of TAXONOMY) {
      const before = await sut.deliveries({ type: row.event });
      const { eventId } = await w.fire(row.event);
      await sut.drainDeliveries();
      rows[row.event] = {
        eventId,
        before,
        events: (await sut.events({ type: row.event })).filter((event) => event.id === eventId),
        deliveries: (await sut.deliveries({ type: row.event })).filter((delivery) => delivery.eventId === eventId),
        opsItems: await sut.opsItems({ linkedEventId: eventId }),
      };
    }

    return {
      actors: { ...w.actors },
      registered: (await sut.taxonomy()).map((row) => row.event),
      defaults: await sut.documentedDefaults(),
      rows,
    };
  },
);

describe.sequential('AT-REQ-016 taxonomy capture and projections', () => {
  atTest(
    'AT-016.03',
    'every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads',
    async (ctx) => {
      const evidence = await ctx.capture(taxonomyEvidence);
      expect(evidenceBuilds, 'the taxonomy evidence was produced more than once').toBe(1);
      const documented = new Map(evidence.defaults.map((entry) => [entry.event, entry.channels]));
      const problems: string[] = [];

      for (const row of TAXONOMY) {
        const captured = evidence.rows[row.event];
        if (captured.before.length > 0) {
          problems.push(`${row.event}: ${captured.before.length} deliveries existed BEFORE the event fired`);
          continue;
        }

        const channels = row.channels ?? documented.get(row.event);
        if (!channels || channels.length === 0) {
          problems.push(`${row.event}: channels unnamed and no documented default to bind to`);
          continue;
        }
        problems.push(...channelRuleProblems(row, channels).map((problem) => `${row.event}: ${problem}`));

        const wanted = expectedPairs(evidence.actors, row.recipients, channels);
        problems.push(...pairProblems(wanted, countPairs(captured.deliveries)).map((problem) => `${row.event}: ${problem}`));

        const predicates = PAYLOAD_PREDICATES[row.event] ?? {};
        for (const key of row.payloadKeys ?? []) {
          if (captured.deliveries.length === 0) {
            problems.push(`${row.event}: payload key "${key}" unverifiable — no deliveries`);
            continue;
          }
          const predicate = predicates[key];
          for (const delivery of captured.deliveries) {
            const failure = predicate
              ? predicate(delivery.payload[key], delivery.body)
              : String(delivery.payload[key] ?? '').trim()
                ? null
                : 'missing';
            if (failure) problems.push(`${row.event} → ${delivery.role}: payload "${key}" ${failure}`);
          }
        }

        if (row.opsItem && captured.opsItems.length !== 1) {
          problems.push(`${row.event}: expected exactly 1 linked ops item, got ${captured.opsItems.length}`);
        }
      }

      const depletedRoles = [...new Set(evidence.rows['fuel.depleted'].deliveries.map((delivery) => delivery.role))].sort();
      if (depletedRoles.join(',') !== 'ngo,platform_admin,volunteer') {
        problems.push(`fuel.depleted: roles ${JSON.stringify(depletedRoles)} — admin escalation missing alongside NGO+volunteer`);
      }

      const reverts = evidence.rows['pm_item.status_auto_reverted'].deliveries;
      if (reverts.length === 0) {
        problems.push('pm_item.status_auto_reverted: no delivery to inspect for penalty language');
      }
      for (const delivery of reverts) {
        const body = delivery.body.toLowerCase();
        const hits = PENALTY_LEXICON.filter((term) => body.includes(term));
        if (hits.length) {
          problems.push(`pm_item.status_auto_reverted: penalty language ${JSON.stringify(hits)} in the copy`);
        }
      }

      expect(problems, `taxonomy rows that did not deliver as specified (${problems.length} problems / ${TAXONOMY.length} rows)`).toEqual(
        [],
      );
    },
  );

  atTest(
    'AT-016.04',
    'sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event',
    async (ctx) => {
      const evidence = await ctx.capture(taxonomyEvidence);
      expect(evidenceBuilds, 'the taxonomy evidence was produced more than once').toBe(1);

      for (const event of ['candidacy.marked', 'match.declined_or_expired']) {
        const deliveries = evidence.rows[event].deliveries;
        expect(deliveries.length, `${event} produced no delivery at all — the probe is not discriminating`).toBeGreaterThan(0);
        expect(
          deliveries.filter((delivery) => delivery.role === 'ngo' || delivery.recipientId === evidence.actors.ngo),
          `${event} leaked to the NGO — match-log events are admin-only`,
        ).toEqual([]);
      }

      const vetting = evidence.rows['vetting.outcome'].deliveries;
      expect(vetting.length, 'vetting.outcome produced no delivery at all').toBeGreaterThan(0);
      expect(
        vetting.filter((delivery) => delivery.role === 'volunteer' || delivery.recipientId === evidence.actors.volunteer),
        "the NGO's vetting outcome leaked to the volunteer",
      ).toEqual([]);

      expect(
        evidence.registered.filter((event) => /donat/i.test(event)),
        'a donation event exists',
      ).toEqual([]);
      const leftover = evidence.rows['leftover.released'].deliveries;
      expect(leftover.length, 'leftover release produced no delivery at all').toBeGreaterThan(0);
      expect(
        leftover.filter((delivery) => /donat/i.test(delivery.body)),
        'leftover release was framed as a donation',
      ).toEqual([]);
    },
  );

  atTest('AT-016.05', 'every critical class goes out by email; the low-tone event is in-app only', async (ctx) => {
    const evidence = await ctx.capture(taxonomyEvidence);
    expect(evidenceBuilds, 'the taxonomy evidence was produced more than once').toBe(1);
    for (const [eventClass, event] of Object.entries(CRITICAL_CLASS_FIXTURES)) {
      const deliveries = evidence.rows[event].deliveries;
      expect(deliveries.length, `${eventClass} (${event}) produced no delivery`).toBeGreaterThan(0);
      expect(
        deliveries.some((delivery) => delivery.channel === 'email'),
        `${eventClass} (${event}) delivered without email — critical classes are email`,
      ).toBe(true);
    }
    expect(
      [...new Set(evidence.rows[LOW_TONE_FIXTURE].deliveries.map((delivery) => delivery.channel))].sort(),
      `${LOW_TONE_FIXTURE} is low-tone: in-app only, never email`,
    ).toEqual(['inapp']);
  });

  atTest('AT-016.06', 'a documented delivery default exists for every taxonomy row', async (ctx) => {
    const evidence = await ctx.capture(taxonomyEvidence);
    expect(evidenceBuilds, 'the taxonomy evidence was produced more than once').toBe(1);
    const documented = new Map(evidence.defaults.map((entry) => [entry.event, entry]));
    const missing = TAXONOMY.filter((row) => !documented.has(row.event))
      .map((row) => row.event)
      .sort();
    expect(missing, 'taxonomy rows with no documented default').toEqual([]);

    const implicit = evidence.defaults
      .filter((entry) => !entry.source.trim() || entry.channels.length === 0)
      .map((entry) => entry.event)
      .sort();
    expect(implicit, 'defaults that are implicit behaviour rather than documentation').toEqual([]);

    const orphans = evidence.defaults
      .filter((entry) => !TAXONOMY.some((row) => row.event === entry.event))
      .map((entry) => entry.event)
      .sort();
    expect(orphans, 'documented defaults for events that are not in the taxonomy').toEqual([]);

    const contradictions: string[] = [];
    for (const row of TAXONOMY) {
      const documentedRow = documented.get(row.event);
      if (!documentedRow) continue;
      contradictions.push(
        ...channelRuleProblems(row, documentedRow.channels).map((problem) => `${row.event}: documented default ${problem}`),
      );
      if (row.channels) {
        const got = [...documentedRow.channels].sort().join(',');
        const wanted = [...row.channels].sort().join(',');
        if (got !== wanted) {
          contradictions.push(`${row.event}: the requirement names [${wanted}] but the documented default says [${got}]`);
        }
      }
    }
    expect(contradictions, 'documented defaults that contradict the requirement they are meant to document').toEqual([]);
  });

  atTest('AT-016.12', 'an escalation-tier event notifies both the NGO and the platform admin', async (ctx) => {
    const evidence = await ctx.capture(taxonomyEvidence);
    expect(evidenceBuilds, 'the taxonomy evidence was produced more than once').toBe(1);
    const deliveries = evidence.rows['lovable.credits_blocked'].deliveries;
    expect(deliveries.length, 'the escalation event delivered to nobody').toBeGreaterThan(0);
    expect(
      [...new Set(deliveries.map((delivery) => delivery.role))].sort(),
      'an escalation-tier event must reach the NGO and the platform admin — exactly those',
    ).toEqual(['ngo', 'platform_admin']);
    expect(
      [...new Set(deliveries.map((delivery) => delivery.recipientId))].sort(),
      'the escalation reached a different actor than the fixture NGO and platform admin',
    ).toEqual([evidence.actors.ngo, evidence.actors.platform_admin].sort());
  });
});
