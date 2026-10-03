import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { at01611 } from './_integration.ts';
import { countPairs, expectedPairs, pairProblems } from './_oracles.ts';
import { GUARDED_ROWS } from './taxonomy.ts';

const MUST_BE_GUARDED = [
  'payment.succeeded',
  'payment.failed',
  'funding.deadline_expired',
  'fuel.threshold_20',
  'fuel.threshold_5',
  'fuel.depleted',
  'leftover.released',
  'chargeback.opened',
  'access.key_issued',
  'access.key_revoked',
  'project.completed',
];

const FAULT_POINT = 'notifications.between_transition_and_event_write';

describe('AT-REQ-016 C — critical-event reliability guard', () => {
  atTest(
    'AT-016.09',
    'every guarded transition writes its notification event atomically under an induced fault',
    { timeoutMs: { integration: 240_000 } },
    async ({ open }) => {
      const guarded = GUARDED_ROWS.map((r) => r.event);
      for (const event of MUST_BE_GUARDED) {
        expect(guarded, `${event} dropped out of the guarded matrix — the parameterization narrowed`).toContain(event);
      }

      const problems: string[] = [];
      for (const row of GUARDED_ROWS) {
        {
          const { w, sut } = await open();
          await w.fire(row.event);
          await sut.drainDeliveries();
          const transition = await w.transitionCommitted(row.event);
          const written = (await sut.events({ type: row.event })).length > 0;
          if (!transition || !written) {
            problems.push(
              `${row.event}: control run (no fault) produced transition=${transition} event=${written} — ` +
                `the fault run's "neither committed" would be indistinguishable from a no-op fixture`,
            );
            continue;
          }
        }

        const { h, w, sut } = await open();
        const fault = await h.faults.at(FAULT_POINT, 'crash');
        try {
          await w.fire(row.event);
        } catch {
          // The induced fault may surface as a thrown error; the state check below is the oracle.
        } finally {
          await fault.clear();
        }
        await sut.drainDeliveries();

        const transitionCommitted = await w.transitionCommitted(row.event);
        const eventWritten = (await sut.events({ type: row.event })).length > 0;
        const deliveryWritten = (await sut.deliveries({ type: row.event })).length > 0;
        const opsItemWritten = (await sut.opsItems()).some((item) => item.kind === row.event);

        if (transitionCommitted || eventWritten || deliveryWritten || opsItemWritten) {
          const committed = [
            ...(transitionCommitted ? ['the transition'] : []),
            ...(eventWritten ? ['the notification event'] : []),
            ...(deliveryWritten ? ['a delivery'] : []),
            ...(opsItemWritten ? ['an ops item'] : []),
          ];
          problems.push(
            `${row.event}: transition=${transitionCommitted} notificationEvent=${eventWritten} ` +
              `delivery=${deliveryWritten} opsItem=${opsItemWritten} — ` +
              `a crash at ${FAULT_POINT} committed ${committed.join(' and ')}; all of it must roll ` +
              `back as one unit, leaving none of it`,
          );
        }
      }

      expect(
        problems,
        `guarded rows where a crash between the transition and the event write left any part of it committed`,
      ).toEqual([]);
    },
  );

  atTest(
    'AT-016.10',
    'recipients resolve at event creation: the old holder receives, the new holder is excluded',
    async ({ open }) => {
      const { w, sut } = await open();

      const original = w.actors.ngo;
      const { eventId } = await w.fire('pm_item.completed');

      const successor = await w.reassignRole('ngo', 'at-016.10-successor');
      expect(successor, 'the role never actually moved — the fixture is not discriminating').not.toBe(original);

      await sut.drainDeliveries();

      const deliveries = (await sut.deliveries({ type: 'pm_item.completed' })).filter((d) => d.eventId === eventId);
      expect(deliveries.length, 'the event delivered to nobody').toBeGreaterThan(0);
      expect(
        [...new Set(deliveries.map((d) => d.recipientId))],
        'recipients were re-resolved at send time',
      ).toEqual([original]);
      expect(
        deliveries.filter((d) => d.recipientId === successor),
        'the newly-eligible holder received a notification created before they held the role',
      ).toEqual([]);
    },
  );

  atTest(
    'AT-016.11',
    'sent only on provider acceptance; unconfirmed sends retry; a lost ack mints no duplicate',
    {
      integration: at01611,
      default: async ({ open }) => {
      const { h, w, sut } = await open();

      h.vendors.email.rejectNext(1);
      const rejected = await w.fire('access.key_issued');
      await sut.drainDeliveries({ passes: 1 });

      const attemptsFor = (eventId: string) => h.vendors.email.attempts().filter((a) => a.eventId === eventId);
      expect(
        attemptsFor(rejected.eventId).map((a) => a.outcome),
        'the provider was never asked to send — the rejection path was not exercised',
      ).toEqual(['rejected']);

      const misdirected = (eventId: string) =>
        attemptsFor(eventId).filter((a) => a.recipientId !== w.actors.volunteer || a.channel !== 'email');
      expect(
        misdirected(rejected.eventId),
        'the provider was handed a recipient or a channel this event never resolved to',
      ).toEqual([]);

      let event = (await sut.events({ type: 'access.key_issued' })).find((e) => e.id === rejected.eventId);
      expect(event, 'the notification event vanished after a provider rejection').toBeDefined();
      expect(['pending', 'retrying'], 'an unaccepted send was marked sent').toContain(event!.state);

      const unconfirmed = (await sut.deliveries({ type: 'access.key_issued' })).filter(
        (d) => d.eventId === rejected.eventId && d.channel === 'email',
      );
      expect(unconfirmed.length, 'the unconfirmed send was silently dropped — nothing observable remains').toBeGreaterThan(0);
      expect(unconfirmed.every((d) => d.state !== 'sent'), 'an unaccepted delivery is marked sent').toBe(true);

      await sut.drainDeliveries();
      const outcomes = attemptsFor(rejected.eventId).map((a) => a.outcome);
      expect(
        outcomes.length,
        `only ${outcomes.length} provider attempt(s) for a rejected send — no retry actually reached the provider`,
      ).toBeGreaterThanOrEqual(2);
      expect(outcomes[outcomes.length - 1], 'the retry did not end in provider acceptance').toBe('accepted');
      expect(
        misdirected(rejected.eventId),
        'the retry reached the provider carrying a recipient or a channel this event never resolved to',
      ).toEqual([]);

      event = (await sut.events({ type: 'access.key_issued' })).find((e) => e.id === rejected.eventId);
      expect(event!.state, 'the accepted send was never marked sent').toBe('sent');
      expect(event!.attempts, "the event's own attempt counter did not record the retry").toBeGreaterThanOrEqual(2);

      h.vendors.email.acceptButLoseAck(1);
      const ambiguous = await w.fire('access.key_revoked');

      await sut.drainDeliveries({ passes: 1 });
      expect(
        attemptsFor(ambiguous.eventId).map((a) => a.outcome),
        'the provider was not asked to send exactly once — the lost-ack path was not exercised as one attempt',
      ).toEqual(['ack_lost']);

      const unacked = (await sut.deliveries({ type: 'access.key_revoked' })).filter(
        (d) => d.eventId === ambiguous.eventId && d.channel === 'email',
      );
      expect(unacked.length, 'the lost-ack send left nothing observable at all').toBeGreaterThan(0);
      expect(
        unacked.every((d) => d.state !== 'sent'),
        'a send whose acknowledgment was lost was marked sent — the sender cannot tell that outcome from silence, so it must not',
      ).toBe(true);

      let ambiguousEvent = (await sut.events({ type: 'access.key_revoked' })).find((e) => e.id === ambiguous.eventId);
      expect(ambiguousEvent, 'the notification event vanished after a lost acknowledgment').toBeDefined();
      expect(['pending', 'retrying'], 'an unacknowledged send was marked sent').toContain(ambiguousEvent!.state);

      await sut.drainDeliveries();
      expect(
        attemptsFor(ambiguous.eventId).map((a) => a.outcome),
        'the retry never reached the provider a second time',
      ).toEqual(['ack_lost', 'accepted']);
      ambiguousEvent = (await sut.events({ type: 'access.key_revoked' })).find((e) => e.id === ambiguous.eventId);
      expect(ambiguousEvent!.attempts, "the event's own attempt counter did not record the retry").toBeGreaterThanOrEqual(2);

      const logical = (await sut.events({ type: 'access.key_revoked' })).filter((e) => e.id === ambiguous.eventId);
      expect(logical.length, 'the retry minted a second logical notification').toBe(1);

      const want = expectedPairs(w.actors, ['volunteer'], ['email', 'inapp']);
      const deliveries = (await sut.deliveries({ type: 'access.key_revoked' })).filter((d) => d.eventId === ambiguous.eventId);
      expect(
        pairProblems(want, countPairs(deliveries)),
        'the lost-ack retry did not leave exactly one delivery per expected recipient-channel pair',
      ).toEqual([]);
      expect(
        deliveries.filter((d) => d.state !== 'sent'),
        'a delivery the provider accepted never reached the sent state',
      ).toEqual([]);

      const acceptedForEvent = h.vendors.email.accepted().filter((a) => a.eventId === ambiguous.eventId);
      expect(
        pairProblems(expectedPairs(w.actors, ['volunteer'], ['email']), countPairs(acceptedForEvent)),
        'the pairs the provider physically accepted are not exactly the pairs this event resolved to',
      ).toEqual([]);
      },
    },
  );
});
