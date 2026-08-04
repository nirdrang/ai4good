/**
 * AT-REQ-016 · C. Critical-event reliability guard — AT-016.09 .. AT-016.11
 * Source: .taskmaster/docs/acceptance/at-req-016.md
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { countPairs, expectedPairs, pairProblems } from './_oracles.ts';
import { GUARDED_ROWS } from './taxonomy.ts';

/** AT-016.09 is parameterized over the FULL guarded matrix, not one sample per class. */
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
    async ({ open }) => {
      const guarded = GUARDED_ROWS.map((r) => r.event);
      for (const event of MUST_BE_GUARDED) {
        expect(guarded, `${event} dropped out of the guarded matrix — the parameterization narrowed`).toContain(event);
      }

      // That the requested point is one the product actually exposes, that a handle is armed
      // where it was asked to be, and that the fault genuinely FIRED are the harness's
      // obligations, checked once in harness/guards.ts (faultPointProblem, faultFiredProblem).
      const problems: string[] = [];
      for (const row of GUARDED_ROWS) {
        // (1) CONTROL, in its own world: without the fault this row must commit BOTH sides.
        // Without this, a row that silently no-ops satisfies "neither committed" and the
        // atomicity oracle passes on a transition that never happened.
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

        // (2) FAULT, in a fresh world: state from the control run (and from previous rows'
        // crashes) must not be able to satisfy this row's observation.
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
        // EVERYTHING THE ROLLBACK CLAIMS, not just the two halves the message used to name. `fire()`
        // also writes deliveries and — for the guarded rows that carry one — an ops item, all after
        // the fault point, and a fault path that put the transition and the event back while leaving
        // an outbox delivery committed used to pass here. The drain above would then have SENT it.
        //
        // The ops items are matched by `kind` rather than by `linkedEventId`: the crashed fire threw
        // instead of returning, so there is no event id to filter on, and `opsItems()` with no filter
        // is the whole set.
        //
        // This widening carries its own falsification, held to the same standard as the tightening
        // below: with a fault path that rolls back exactly the transition and the event record and
        // leaves the delivery and the ops item committed, the two-read form passes and this one
        // fails (`loop/items/AI4DEV-19/proof-oracle.txt`, part two).
        const deliveryWritten = (await sut.deliveries({ type: row.event })).length > 0;
        const opsItemWritten = (await sut.opsItems()).some((item) => item.kind === row.event);

        // NEITHER SIDE COMMITTED, not merely the two agreeing with each other.
        //
        // This oracle used to read `transitionCommitted !== eventWritten`, and that rejected only
        // UNEQUAL outcomes — so a fault firing after both writes left both committed, compared
        // equal, and passed, having proved no atomicity whatsoever. The control run above does not
        // close it either: that also ends with both committed. Turning this test green against the
        // old oracle would have been a green bought with nothing.
        //
        // Asserting both false rejects a strict superset of what "unequal" rejected, so it cannot
        // pass anything the old form failed. Its falsification is on file: with the fault point
        // moved after both writes, the old form passes and this one fails
        // (`loop/items/AI4DEV-19/proof-oracle.txt`).
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
    async ({ open }) => {
      const { h, w, sut } = await open();

      // (a) the provider refuses to accept a critical send.
      // ONE worker pass: a run-to-quiescence drain could reject, retry and succeed inside the
      // same call, leaving the unconfirmed state — the thing this clause is about — unobservable.
      h.vendors.email.rejectNext(1);
      const rejected = await w.fire('access.key_issued');
      await sut.drainDeliveries({ passes: 1 });

      const attemptsFor = (eventId: string) => h.vendors.email.attempts().filter((a) => a.eventId === eventId);
      expect(
        attemptsFor(rejected.eventId).map((a) => a.outcome),
        'the provider was never asked to send — the rejection path was not exercised',
      ).toEqual(['rejected']);

      let event = (await sut.events({ type: 'access.key_issued' })).find((e) => e.id === rejected.eventId);
      expect(event, 'the notification event vanished after a provider rejection').toBeDefined();
      expect(['pending', 'retrying'], 'an unaccepted send was marked sent').toContain(event!.state);

      const unconfirmed = (await sut.deliveries({ type: 'access.key_issued' })).filter(
        (d) => d.eventId === rejected.eventId && d.channel === 'email',
      );
      expect(unconfirmed.length, 'the unconfirmed send was silently dropped — nothing observable remains').toBeGreaterThan(0);
      expect(unconfirmed.every((d) => d.state !== 'sent'), 'an unaccepted delivery is marked sent').toBe(true);

      // (b) a REAL retry reaches the provider again, and only then is it marked sent.
      // `attempts` on the event record is the SUT's own counter; the provider-side trace is not.
      await sut.drainDeliveries();
      const outcomes = attemptsFor(rejected.eventId).map((a) => a.outcome);
      expect(
        outcomes.length,
        `only ${outcomes.length} provider attempt(s) for a rejected send — no retry actually reached the provider`,
      ).toBeGreaterThanOrEqual(2);
      expect(outcomes[outcomes.length - 1], 'the retry did not end in provider acceptance').toBe('accepted');

      event = (await sut.events({ type: 'access.key_issued' })).find((e) => e.id === rejected.eventId);
      expect(event!.state, 'the accepted send was never marked sent').toBe('sent');
      expect(event!.attempts, "the event's own attempt counter did not record the retry").toBeGreaterThanOrEqual(2);

      // (c) the ambiguous outcome: provider ACCEPTED, acknowledgment lost before the durable mark
      h.vendors.email.acceptButLoseAck(1);
      const ambiguous = await w.fire('access.key_revoked');

      // ONE PASS FIRST, and the unconfirmed state is OBSERVED rather than assumed. Under a
      // run-to-quiescence drain the lost-ack attempt and its replay both happen inside the same
      // call, so the assertions below this block cannot tell a sender that retried from one that
      // received `no_ack` and wrongly marked the delivery sent on the spot: one logical row, both
      // deliveries sent, exactly one accepted pair — true of both. That fixture is the defect this
      // clause exists to catch, so the pass boundary is where it has to be caught.
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

      // THE RETRY PHYSICALLY HAPPENS, and the provider's trace is what says so — not the SUT's own
      // counter, which is checked beside it precisely because the two can disagree.
      await sut.drainDeliveries();
      expect(
        attemptsFor(ambiguous.eventId).map((a) => a.outcome),
        'the retry never reached the provider a second time',
      ).toEqual(['ack_lost', 'accepted']);
      ambiguousEvent = (await sut.events({ type: 'access.key_revoked' })).find((e) => e.id === ambiguous.eventId);
      expect(ambiguousEvent!.attempts, "the event's own attempt counter did not record the retry").toBeGreaterThanOrEqual(2);

      const logical = (await sut.events({ type: 'access.key_revoked' })).filter((e) => e.id === ambiguous.eventId);
      expect(logical.length, 'the retry minted a second logical notification').toBe(1);

      // The expected pair set comes from the taxonomy + the fixture's actors, so "no duplicates"
      // cannot be satisfied by producing no deliveries at all.
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

      // Provider side: the email pair was physically accepted, and accepted exactly once.
      const acceptedPairs = h.vendors.email
        .accepted()
        .filter((a) => a.eventId === ambiguous.eventId)
        .map((a) => `${a.recipientId}:${a.channel}`);
      expect(acceptedPairs.length, 'the provider never accepted the send at all').toBeGreaterThan(0);
      expect(acceptedPairs.length, 'the provider accepted the same recipient-channel pair twice').toBe(new Set(acceptedPairs).size);
    },
  );
});
