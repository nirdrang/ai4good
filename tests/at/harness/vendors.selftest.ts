/**
 * H5's wall: the email provider simulator, proved on both the accepting and the refusing side.
 *
 * Rule 2 of the suite-authoring rules puts the generic self-checks in the harness once, and names
 * the price: a bug in a centralized seam green-lights every suite that leans on it, with no suite
 * showing a symptom. The vendor seam is the sharpest case of that. AT-016.11 asks the simulator to
 * be the out-of-band witness for "sent only on provider acceptance, unconfirmed sends retry, a lost
 * acknowledgment mints no duplicate" — so a simulator that accepted everything, or that recorded a
 * replay as a second acceptance, would make that id say the opposite of what it claims while still
 * passing.
 *
 * WHAT THE SUITE CANNOT SEE, AND THIS FILE THEREFORE MUST. AT-016.11 arms one outcome at a time, so
 * nothing in the suite can tell one cross-method FIFO queue from two per-kind counters that always
 * serve rejections first. Both arming orders are driven here, with two distinct send identities,
 * because call order is the only meaning `rejectNext(1); acceptButLoseAck(1)` can honestly have.
 *
 * The last two cases drive `createHarness()` rather than the factory directly, for the reason the
 * clock case in `conformance.selftest.ts` gives: what is worth proving is that the simulator a suite
 * is really HANDED is the one the delivery path behind it really reaches.
 */

import { describe, expect, it } from 'vitest';

import { CapabilityPending } from './capabilities.ts';
import { createHarness } from './index.ts';
import { createEmailProviderSim } from './vendors.ts';
import type { NotificationsSut, World } from '../suites/req-016/_contract.ts';

/** Four DISTINCT send identities. Same event, different recipients — the shape a real event produces. */
const SEND_A = { recipientId: 'volunteer-1', eventId: 'event-1', channel: 'email' };
const SEND_B = { recipientId: 'volunteer-2', eventId: 'event-1', channel: 'email' };
const SEND_C = { recipientId: 'volunteer-3', eventId: 'event-1', channel: 'email' };
const SEND_D = { recipientId: 'volunteer-4', eventId: 'event-1', channel: 'email' };

const IDENTITY_A = 'event-1:volunteer-1:email';

describe('the H5 wall: the email provider simulator', () => {
  it('serves an armed rejection to the next send and then returns to accepting', () => {
    const { sim, port } = createEmailProviderSim();

    sim.rejectNext(1);
    expect(port.deliver(SEND_A), 'the armed rejection was never served — the rejection path is unreachable').toBe('rejected');
    expect(
      port.deliver(SEND_A),
      'the provider kept rejecting after its one armed outcome was spent, so "the next N sends" means nothing',
    ).toBe('accepted');

    expect(sim.attempts().map((attempt) => attempt.outcome)).toEqual(['rejected', 'accepted']);
    expect(
      sim.accepted().map((attempt) => attempt.outcome),
      'a send the provider refused was recorded as accepted',
    ).toEqual(['accepted']);
  });

  it('records a lost acknowledgment as a PHYSICAL acceptance while telling the sender only that it is unconfirmed', () => {
    const { sim, port } = createEmailProviderSim();

    sim.acceptButLoseAck(1);
    expect(
      port.deliver(SEND_A),
      'the sender was told the provider accepted — it cannot know that, and AT-016.11(c) is about exactly that ignorance',
    ).toBe('no_ack');

    expect(sim.attempts().map((attempt) => attempt.outcome), 'the send never arrived at the seam').toEqual(['ack_lost']);
    expect(
      sim.accepted().map((attempt) => attempt.outcome),
      'a send the provider physically accepted is missing from accepted(), so a duplicate could never be detected',
    ).toEqual(['ack_lost']);
  });

  it('acks a replay of an accepted identity without accepting it twice, and without spending an armed outcome', () => {
    const { sim, port } = createEmailProviderSim();

    expect(port.deliver(SEND_A)).toBe('accepted');
    sim.rejectNext(1);

    expect(port.deliver(SEND_A), 'a replay of an accepted identity was not acked the way a real provider acks one').toBe(
      'accepted',
    );
    expect(
      sim.attempts().map((attempt) => attempt.outcome),
      'the replay is missing from the arrival trace — it really did arrive, and the trace is what proves the retry happened',
    ).toEqual(['accepted', 'accepted']);
    expect(
      sim.accepted().length,
      'the replay was recorded as a SECOND acceptance, so "a lost ack mints no duplicate" becomes unprovable',
    ).toBe(1);

    // A REPLAY IS NOT ONE OF "THE NEXT N SENDS". Letting it eat the armed rejection would silently
    // disarm the case a test had just set up, and the test would read the following default
    // acceptance as if it were the outcome it armed.
    expect(port.deliver(SEND_B), 'the replay consumed the armed rejection, disarming the case silently').toBe('rejected');
  });

  it('leaves a REJECTED identity free to succeed on its retry', () => {
    const { sim, port } = createEmailProviderSim();

    sim.rejectNext(1);
    expect(port.deliver(SEND_A)).toBe('rejected');
    expect(
      port.deliver(SEND_A),
      'a refused identity was treated as already accepted, so no retry of a rejected send could ever succeed',
    ).toBe('accepted');

    expect(sim.attempts().map((attempt) => attempt.outcome)).toEqual(['rejected', 'accepted']);
    expect(
      sim.accepted().map((attempt) => `${attempt.eventId}:${attempt.recipientId}:${attempt.channel}`),
      'the identity that finally succeeded is not the one recorded as accepted',
    ).toEqual([IDENTITY_A]);
  });

  it('keeps two sends apart when their ids merely CONCATENATE the same way', () => {
    // The identity used to be `${eventId}:${recipientId}:${channel}`, and all three fields are
    // unrestricted strings, so these two distinct sends produced one identity: the second was
    // answered as a replay of the first and never delivered to anybody. A provider that swallows a
    // physically new send is the exact opposite of what idempotency is for.
    const { sim, port } = createEmailProviderSim();

    expect(port.deliver({ eventId: 'e:a', recipientId: 'b', channel: 'email' })).toBe('accepted');
    expect(port.deliver({ eventId: 'e', recipientId: 'a:b', channel: 'email' })).toBe('accepted');
    expect(
      sim.accepted().map((attempt) => `${attempt.eventId}|${attempt.recipientId}`),
      'the second send was swallowed as a replay of the first — a delimiter collision, not a duplicate',
    ).toEqual(['e:a|b', 'e|a:b']);
  });

  it('treats the same event and recipient on a SECOND channel as an independent send', () => {
    // A simulator that deduped on `eventId:recipientId` alone passes every other case in this file
    // and the whole of AT-016.11 — REQ-016's in-app channel bypasses the port by design, so nothing
    // else here sends the same pair twice on two channels. It would then suppress a physically new
    // send the moment a second provider-backed channel exists.
    const { sim, port } = createEmailProviderSim();

    expect(port.deliver(SEND_A)).toBe('accepted');
    expect(port.deliver({ ...SEND_A, channel: 'sms' }), 'a send on a second channel was answered as a replay').toBe(
      'accepted',
    );
    expect(
      sim.accepted().map((attempt) => attempt.channel),
      'the channel is not part of the send identity, so one channel silently suppresses the other',
    ).toEqual(['email', 'sms']);
  });

  it('refuses an arming count that queues nothing, for both arming methods, and arms nothing when it refuses', () => {
    const { sim, port } = createEmailProviderSim();

    for (const count of [0, -1]) {
      expect(() => sim.rejectNext(count), `rejectNext(${count}) armed nothing and said nothing`).toThrow(/queues nothing/);
      expect(() => sim.acceptButLoseAck(count), `acceptButLoseAck(${count}) armed nothing and said nothing`).toThrow(
        /queues nothing/,
      );
    }
    expect(() => sim.rejectNext(1.5), 'a fractional count was silently rounded into some meaning').toThrow(/whole number/);
    expect(() => sim.acceptButLoseAck(1.5), 'a fractional count was silently rounded into some meaning').toThrow(
      /whole number/,
    );

    // The refusal names the method, so an author can see WHICH arming was refused.
    expect(() => sim.rejectNext(0)).toThrow(/rejectNext/);
    expect(() => sim.acceptButLoseAck(0)).toThrow(/acceptButLoseAck/);

    expect(
      port.deliver(SEND_A),
      'a refused arming still queued an outcome — the refusal was a message, not a refusal',
    ).toBe('accepted');
  });

  it('leaves an ALREADY-ARMED queue untouched when it refuses a later invalid arming', () => {
    // The case above only ever refuses on an empty queue, so an implementation that cleared the
    // queue and then threw would pass it — and would silently disarm a case a test had already set
    // up, which is the same catastrophe as arming nothing while reporting an arming.
    const { sim, port } = createEmailProviderSim();

    sim.rejectNext(1);
    expect(() => sim.rejectNext(0)).toThrow(/queues nothing/);
    expect(() => sim.acceptButLoseAck(1.5)).toThrow(/whole number/);

    expect(
      port.deliver(SEND_A),
      'the refused arming emptied the queue armed before it — a refusal must change nothing at all',
    ).toBe('rejected');
  });

  it('hands out copies of its traces, so an assertion cannot rewrite the record the next one reads', () => {
    const { sim, port } = createEmailProviderSim();
    port.deliver(SEND_A);

    const attempts = sim.attempts();
    attempts.length = 0;
    const accepted = sim.accepted();
    accepted.splice(0, accepted.length);
    expect(sim.attempts(), 'emptying a returned array emptied the simulator itself').toHaveLength(1);
    expect(sim.accepted(), 'emptying a returned array emptied the simulator itself').toHaveLength(1);

    const [entry] = sim.attempts();
    entry.outcome = 'rejected';
    expect(sim.attempts()[0].outcome, 'rewriting a returned attempt rewrote the recorded outcome').toBe('accepted');
  });

  it('serves forced outcomes in CALL order across both arming methods, never by outcome kind', () => {
    // Two per-kind counters that always served rejections first would pass every case above and the
    // whole of AT-016.11, and fail only here — which is why both orders are driven.
    const lostFirst = createEmailProviderSim();
    lostFirst.sim.acceptButLoseAck(1);
    lostFirst.sim.rejectNext(1);
    expect(lostFirst.port.deliver(SEND_A)).toBe('no_ack');
    expect(lostFirst.port.deliver(SEND_B)).toBe('rejected');
    expect(
      lostFirst.sim.attempts().map((attempt) => attempt.outcome),
      'acceptButLoseAck() was armed first and the rejection was served first — the queue is ordered by kind, not by call',
    ).toEqual(['ack_lost', 'rejected']);

    const rejectFirst = createEmailProviderSim();
    rejectFirst.sim.rejectNext(1);
    rejectFirst.sim.acceptButLoseAck(1);
    expect(rejectFirst.port.deliver(SEND_A)).toBe('rejected');
    expect(rejectFirst.port.deliver(SEND_B)).toBe('no_ack');
    expect(
      rejectFirst.sim.attempts().map((attempt) => attempt.outcome),
      'the reverse arming order produced the same sequence, so call order decides nothing',
    ).toEqual(['rejected', 'ack_lost']);
  });

  it('serves forced outcomes in call order at counts ABOVE ONE, in both arming orders', () => {
    // Counts of one cannot tell one FIFO queue from a chunk round-robin that alternates between the
    // two armings: both answer `rejectNext(1); acceptButLoseAck(1)` identically, and both pass the
    // single-kind `rejectNext(3)` case in the harness block below. At counts of two they diverge —
    // a round-robin returns rejected, ack_lost, rejected, ack_lost — so this is where the queue's
    // claimed meaning is actually pinned.
    const sends = [SEND_A, SEND_B, SEND_C, SEND_D];

    const rejectFirst = createEmailProviderSim();
    rejectFirst.sim.rejectNext(2);
    rejectFirst.sim.acceptButLoseAck(2);
    for (const send of sends) rejectFirst.port.deliver(send);
    expect(
      rejectFirst.sim.attempts().map((attempt) => attempt.outcome),
      'two rejections were armed before two lost acks and the queue did not serve them in that order',
    ).toEqual(['rejected', 'rejected', 'ack_lost', 'ack_lost']);

    const lostFirst = createEmailProviderSim();
    lostFirst.sim.acceptButLoseAck(2);
    lostFirst.sim.rejectNext(2);
    for (const send of sends) lostFirst.port.deliver(send);
    expect(
      lostFirst.sim.attempts().map((attempt) => attempt.outcome),
      'the mirrored arming order did not produce the mirrored sequence, so call order decides nothing at counts above one',
    ).toEqual(['ack_lost', 'ack_lost', 'rejected', 'rejected']);
  });
});

describe('the H5 wall, through the harness a suite is really handed', () => {
  it('gives a suite the LIVE simulator, reports it as a stand-in, and leaves the static scan pending', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const world = (await h.fixtures.world('vendors-live')) as World;
      const sut = h.sut.notifications as NotificationsSut;

      h.vendors.email.rejectNext(1);
      const { eventId } = await world.fire('access.key_issued');
      await sut.drainDeliveries({ passes: 1 });

      expect(
        h.vendors.email.attempts().filter((attempt) => attempt.eventId === eventId).map((attempt) => attempt.outcome),
        'the simulator the suite holds is not the one the delivery path reaches',
      ).toEqual(['rejected']);

      // A STAND-IN, AND SAID SO. `registry.ts` refuses any stubbed capability above the loop tier, so
      // this label is what stops an integration-tier run grading against the simulator.
      expect(
        await h.stubbedCapabilities(),
        'the provider simulator dropped off the provenance ledger — an integration-tier run would accept it',
      ).toContain('vendors.email');

      // THE STATIC SCAN IS STILL PENDING, and it names ONLY itself now. It is a real-source
      // capability: at loop tier there is no product source to scan, and scanning the fixture would
      // be the self-report `contracts.ts` forbids.
      let thrown: unknown = null;
      try {
        void h.static.providerClientImporters();
      } catch (err) {
        thrown = err;
      }
      expect(thrown, 'the static provider scan stopped refusing, with no product source to have read').toBeInstanceOf(
        CapabilityPending,
      );
      expect(
        (thrown as CapabilityPending).capabilities,
        'the pending seam still names a capability that has landed, which is a declared fact drifting from a real one',
      ).toEqual(['H3 static provider scan']);
    } finally {
      await h.teardown();
    }
  });

  it('reaches quiescence across consecutive forced rejections on ONE default drain', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const world = (await h.fixtures.world('vendors-quiescence')) as World;
      const sut = h.sut.notifications as NotificationsSut;

      h.vendors.email.rejectNext(3);
      const { eventId } = await world.fire('access.key_issued');
      await sut.drainDeliveries();

      expect(
        h.vendors.email.attempts().filter((attempt) => attempt.eventId === eventId).map((attempt) => attempt.outcome),
        'the default drain stopped short of quiescence — a pass cap on the worker looks exactly like this',
      ).toEqual(['rejected', 'rejected', 'rejected', 'accepted']);

      const deliveries = (await sut.deliveries({ type: 'access.key_issued' })).filter(
        (delivery) => delivery.eventId === eventId,
      );
      expect(deliveries.length, 'the event produced no delivery at all').toBeGreaterThan(0);
      expect(
        deliveries.filter((delivery) => delivery.state !== 'sent'),
        'a delivery the provider finally accepted never reached the sent state',
      ).toEqual([]);
    } finally {
      await h.teardown();
    }
  });

  it('REFUSES a pass budget that is not a whole number of passes, rather than interpreting one', async () => {
    const h = await createHarness({ requirement: 'req-016', tier: 'loop' });
    try {
      const world = (await h.fixtures.world('vendors-pass-budget')) as World;
      const sut = h.sut.notifications as NotificationsSut;

      // WITH WORK WAITING, so a drain that interpreted the value instead of refusing it would
      // return normally having done something — `passes: 0` no pass at all while reading as one
      // bounded pass, `passes: 1.5` two of them. AT-016.11 asks for exactly one pass because the
      // state BETWEEN attempts is what it observes; a budget that means something else there is a
      // green bought from a run the test never asked for.
      await world.fire('access.key_issued');

      await expect(
        sut.drainDeliveries({ passes: 0 }),
        'a budget of zero passes was accepted — the drain read as bounded and ran nothing',
      ).rejects.toThrow(/passes=0/);
      await expect(
        sut.drainDeliveries({ passes: 1.5 }),
        'a fractional budget was silently rounded into some meaning',
      ).rejects.toThrow(/passes=1\.5/);

      expect(
        (await sut.deliveries()).filter((delivery) => delivery.state !== 'pending'),
        'the refused drain still ran a pass before refusing — a refusal must leave the work exactly where it was',
      ).toEqual([]);
    } finally {
      await h.teardown();
    }
  });
});
