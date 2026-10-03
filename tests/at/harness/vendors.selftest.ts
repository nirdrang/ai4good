import { describe, expect, it } from 'vitest';

import { CapabilityPending } from './registry.ts';
import { createHarness } from './index.ts';
import { createEmailProviderSim, createAnthropicMessagesSim } from './vendors.ts';
import type { NotificationsSut, World } from '../suites/req-016/_contract.ts';

describe('Anthropic Messages simulator', () => {
  const request = { model: 'test-model', maxTokens: 128, effort: 'low' as const, system: [{ text: 'Ask a question.', cached: true }], tools: [],
    messages: [{ role: 'user' as const, content: 'Hello' }] };
  it('streams bounded pieces and records the same request once', async () => {
    const { sim, port } = createAnthropicMessagesSim();
    const text = 'Which reporting deadline would you like the tracker to remind you about first?';
    sim.script([{ kind: 'text', text, usage: { inputTokens: 512, outputTokens: 32 } }]);
    const deltas: string[] = [];
    const answer = await port.stream(request, (delta) => deltas.push(delta), new AbortController().signal);
    expect(deltas.join('')).toBe(text);
    expect(deltas.every((delta) => delta.length <= 20)).toBe(true);
    expect(answer).toMatchObject({ ok: true, text, usage: { inputTokens: 512, outputTokens: 32 } });
    expect(sim.requests()).toEqual([request]);
  });
  it('settles an interrupted replay with partial text and a count of that text', async () => {
    const { sim, port } = createAnthropicMessagesSim();
    const text = 'Which reporting deadline would you like the tracker to remind you about first?';
    sim.script([{ kind: 'text', text, usage: { inputTokens: 512, outputTokens: 32 } }]);
    const abort = new AbortController();
    const answer = await port.stream(request, () => abort.abort(), abort.signal);
    const received = text.slice(0, 20);
    expect(answer).toMatchObject({ ok: true, text: received, stopReason: 'user_stopped',
      usage: { inputTokens: 512,
        outputTokens: Math.ceil(JSON.stringify([{ role: 'assistant', content: received }]).length / 4) },
      toolUse: null });
    expect(sim.requests()).toEqual([request]);
  });
  it('honours an already aborted stream without emitting text', async () => {
    const { sim, port } = createAnthropicMessagesSim();
    sim.script([{ kind: 'text', text: 'Question?', usage: { inputTokens: 512, outputTokens: 32 } }]);
    const abort = new AbortController();
    abort.abort();
    const deltas: string[] = [];
    expect(await port.stream(request, (delta) => deltas.push(delta), abort.signal)).toEqual({
      ok: false, status: 499, reason: 'the client cancelled before the provider answered',
    });
    expect(deltas).toEqual([]);
    expect(sim.requests()).toEqual([]);
  });
  it('folds cache read tokens into the metered input count', async () => {
    const { sim, port } = createAnthropicMessagesSim();
    sim.script([{ kind: 'text', text: 'Question?', usage: { inputTokens: 80, outputTokens: 32, cacheReadInputTokens: 400 } }]);
    expect(await port.create(request)).toMatchObject({ ok: true, usage: { inputTokens: 480, outputTokens: 32 } });
  });
  it('caps output on text and tool replies', async () => {
    const { sim, port } = createAnthropicMessagesSim();
    sim.script([
      { kind: 'text', text: 'Question?', inputTokens: 256, usage: { inputTokens: 512, outputTokens: 200 } },
      { kind: 'tool', name: 'reply', input: { complete: true }, usage: { inputTokens: 600, outputTokens: 64 } },
    ]);
    expect(sim.requests()).toEqual([]);
    expect(await port.create(request)).toMatchObject({ ok: true, text: 'Question?', stopReason: 'max_tokens',
      usage: { inputTokens: 512, outputTokens: request.maxTokens } });
    expect(await port.create(request)).toMatchObject({ ok: true, stopReason: 'tool_use', toolUse: { name: 'reply', input: { complete: true } } });
    expect(sim.requests()).toEqual([request, request]);
    const copied = sim.requests();
    copied[0].messages[0].content = 'changed';
    expect(sim.requests()[0]).toEqual(request);
    await expect(port.create(request)).rejects.toThrow('exceeded its scripted replies');
  });
  it('returns definite and uncertain errors', async () => {
    const { sim, port } = createAnthropicMessagesSim();
    sim.script([{ kind: 'error', status: 429, reason: 'busy' }, { kind: 'error', status: null, reason: 'timeout' }]);
    expect(await port.create(request)).toEqual({ ok: false, status: 429, reason: 'busy' });
    expect(await port.create(request)).toEqual({ ok: false, status: null, reason: 'timeout' });
    await expect(port.create(request)).rejects.toThrow('exceeded its scripted replies');
  });
});

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
    const { sim, port } = createEmailProviderSim();

    expect(port.deliver({ eventId: 'e:a', recipientId: 'b', channel: 'email' })).toBe('accepted');
    expect(port.deliver({ eventId: 'e', recipientId: 'a:b', channel: 'email' })).toBe('accepted');
    expect(
      sim.accepted().map((attempt) => `${attempt.eventId}|${attempt.recipientId}`),
      'the second send was swallowed as a replay of the first — a delimiter collision, not a duplicate',
    ).toEqual(['e:a|b', 'e|a:b']);
  });

  it('treats the same event and recipient on a SECOND channel as an independent send', () => {
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

    expect(() => sim.rejectNext(0)).toThrow(/rejectNext/);
    expect(() => sim.acceptButLoseAck(0)).toThrow(/acceptButLoseAck/);

    expect(
      port.deliver(SEND_A),
      'a refused arming still queued an outcome — the refusal was a message, not a refusal',
    ).toBe('accepted');
  });

  it('leaves an ALREADY-ARMED queue untouched when it refuses a later invalid arming', () => {
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
