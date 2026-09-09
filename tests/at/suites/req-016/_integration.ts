/**
 * REQ-016's INTEGRATION-TIER test bodies, against the one stack.
 *
 * WHY THESE ARE SEPARATE BODIES AND NOT THE LOOP ONES RUN AGAIN. Some criteria are proved by
 * DIFFERENT PROCEDURES at the two tiers, proving the same criterion. AT-016.01's loop body reads
 * the provider simulator's trace to prove that no send reached the provider outside an emitter
 * event; above loop there is no simulator, and the same clause is proved by reading the mail
 * catcher, which is the record the sender does not write. The criterion never forks. Both bodies
 * cite the same acceptance text, and the id is registered once, with the tier choosing which
 * procedure runs.
 *
 * AT-016.08's loop body commands the harness clock. Above loop the clock has `now()` and nothing
 * else, so this file's procedure waits real time against two short pinned windows, and the live
 * world reads those pins from its name because the live factory never receives `h.config`.
 */

import { expect } from 'vitest';

import type { Sentinels } from '../../harness/contracts.ts';
import type { AtContext as HarnessAtContext } from '../../harness/registry.ts';
import type { NotificationsSut, World } from './_contract.ts';
import { messagesAddressedTo } from './_mail-witness.ts';
import { countPairs, expectedPairs, pairProblems } from './_oracles.ts';
import {
  PROVIDER_FAULT_POINT,
  recordedProviderAccepted,
  recordedProviderAttempts,
} from './_provider-faults.ts';
import { providerClientImporters, strayNotificationWriters } from './_source-scan.ts';

const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';
const GUARD_COALESCE_KEY = 'req-015.thread_comment_notifications.coalesce';

const waitMs = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The integration tier's context: no clock control seam, and a mail catcher instead of a sim. */
type Ctx = HarnessAtContext<'req-016', 'notifications', 'integration'>;

/** The three domains REQ-016 says never send comms directly. */
export const DOMAIN_PROBES = [
  { domain: 'blockers', component: 'blockers.service', event: 'blocker.raised' },
  { domain: 'scope_additions', component: 'scope.service', event: 'thread.comment' },
  { domain: 'lifecycle', component: 'lifecycle.service', event: 'pm_item.status_changed' },
] as const;

/**
 * AT-016.01's arms that are the same at both tiers: the two source oracles, the architecture's
 * self-report, and a sentinel raised in each domain reaching a recipient only through the emitter.
 * Returns the planted sentinel value per domain, so the tier's own out-of-band arm can look for it.
 */
export async function assertEmitterIsSoleWriter(
  atId: string,
  sut: NotificationsSut,
  w: World,
  sentinels: Sentinels,
): Promise<Record<string, string>> {
  // (1) OUT-OF-BAND first. `senders()` and `Delivery.emittedBy` are both produced by the
  // component under test: a rogue direct sender can omit itself and stamp the emitter's name.
  // The source-level scans are the witnesses that are not the subject, once for sending and
  // once for writing.
  expect(
    providerClientImporters().sort(),
    'a component other than the emitter imports a comms-provider client or holds its credential',
  ).toEqual(['notifications.emitter']);
  expect(strayNotificationWriters(), 'something other than the emitter inserts into the notification outbox').toEqual([]);

  // (2) the architecture's own self-report must agree with the scan
  const senders = await sut.senders();
  expect(
    senders.filter((s) => s.canSendDirectly).map((s) => s.component).sort(),
    'more than one component holds send capability',
  ).toEqual(['notifications.emitter']);

  // The probe must actually SEE the three domains, otherwise the assertion above is vacuous.
  for (const p of DOMAIN_PROBES) {
    const probe = senders.find((s) => s.component === p.component);
    expect(probe, `${p.domain} absent from the sender probe, so the probe is not discriminating`).toBeDefined();
    expect(probe!.canSendDirectly, `${p.domain} holds a direct send path`).toBe(false);
  }

  // (3) a sentinel raised in each domain must reach recipients, and only via the emitter.
  // That each planted value is long enough to discriminate and has never been planted before
  // is the harness's obligation, checked once in harness/guards.ts (sentinelValueProblem).
  const planted: Record<string, string> = {};
  for (const p of DOMAIN_PROBES) {
    const sentinel = await sentinels.plant('notification-body', `${atId}/${p.domain}/${Date.now()}`);
    planted[p.domain] = sentinel.value;
    expect(
      (await sut.deliveries()).filter((d) => d.body.includes(sentinel.value)),
      `${p.domain} sentinel was already present before the domain fired: absence baseline broken`,
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
  return planted;
}

/**
 * AT-016.01 above loop. The shared arms, then the mail catcher as the provider-side trace.
 *
 * WHAT IS LIVE HERE THAT WAS NOT AT LOOP TIER: `w.fire` reaches the fixture producer definer and
 * `public.emit_notification` inside one transaction, the drain runs the product's SMTP provider
 * against the stack's own catcher, and every delivery row is read back as the operator. The
 * catcher's record is read by address: every message addressed to this world that carries the
 * notification headers names an event the emitter wrote, and no message addressed to this world
 * arrived without those headers, which is what "no path around the emitter" means on a real wire.
 * The check is not vacuous: `blocker.raised` delivers by email, so the blocker sentinel must be
 * found in a physical message to the world's NGO.
 */
export async function at01601(ctx: Ctx): Promise<void> {
  const { h, w, sut } = await ctx.open();
  const planted = await assertEmitterIsSoleWriter(ctx.atId, sut, w, h.sentinels);

  const emitterEventIds = new Set((await sut.events()).map((e) => e.id));
  const messages = await messagesAddressedTo(Object.values(w.addresses));

  const unstamped = messages.filter((m) => m.eventId === null);
  expect(unstamped.map((m) => m.subject), 'a message reached this world without the emitter headers, so something other than the emitter sent it').toEqual([]);
  const orphaned = messages.filter((m) => m.eventId !== null && !emitterEventIds.has(m.eventId));
  expect(orphaned.map((m) => m.eventId), 'a send reached the provider without a corresponding emitter event').toEqual([]);

  const blockerMail = messages.filter((m) => m.to.includes(w.addresses.ngo) && m.body.includes(planted.blockers));
  expect(blockerMail.length, 'the blocker sentinel never reached the NGO as a physical message at the catcher').toBeGreaterThan(0);
  expect(
    [...new Set(blockerMail.map((m) => m.recipientId))],
    'the message carrying the blocker sentinel names a recipient other than the NGO',
  ).toEqual([w.actors.ngo]);
}

function guardWorldName(cap: number, windowMs: number, coalesce: boolean): string {
  return `req-016/guard?cap=${cap}&window=${windowMs}&coalesce=${coalesce}`;
}

/**
 * AT-016.08 above loop. Two explicit pins with short windows, three seconds and five seconds, and
 * real elapsed time. The procedure reads the pins back from `h.config` and opens a world named
 * `req-016/guard?cap=<cap>&window=<ms>&coalesce=<bool>`, so the numbers the body asserts against
 * and the numbers the guard runs on are one value, read once.
 */
export async function at01608(ctx: Ctx): Promise<void> {
  const variants = [
    {
      name: 'cap without coalescing, three second window',
      overrides: { [GUARD_CAP_KEY]: 2, [GUARD_WINDOW_KEY]: 3_000, [GUARD_COALESCE_KEY]: false },
    },
    {
      name: 'coalescing, five second window, higher cap',
      overrides: { [GUARD_CAP_KEY]: 4, [GUARD_WINDOW_KEY]: 5_000, [GUARD_COALESCE_KEY]: true },
    },
  ] as const;

  const observed: { name: string; delivered: number }[] = [];

  for (const variant of variants) {
    const { h, w, sut } = await ctx.open(
      guardWorldName(variant.overrides[GUARD_CAP_KEY], variant.overrides[GUARD_WINDOW_KEY], variant.overrides[GUARD_COALESCE_KEY]),
      { config: variant.overrides },
    );
    const cap = h.config.get<number>(GUARD_CAP_KEY);
    const windowMs = h.config.get<number>(GUARD_WINDOW_KEY);
    const coalesce = h.config.get<boolean>(GUARD_COALESCE_KEY);
    expect(
      guardWorldName(cap, windowMs, coalesce),
      'the world the guard ran on and the registry pin the body asserts against are not the same numbers',
    ).toBe(guardWorldName(variant.overrides[GUARD_CAP_KEY], variant.overrides[GUARD_WINDOW_KEY], variant.overrides[GUARD_COALESCE_KEY]));

    const burst = cap + 5;
    const expectedDelivered = coalesce ? 1 : cap;
    const where = `${variant.name} (cap=${cap}, window=${windowMs}ms, coalesce=${coalesce})`;
    expect(expectedDelivered, `${where} describes a no-op guard for a burst of ${burst}`).toBeLessThan(burst);

    const pair = `${w.actors.volunteer}:inapp`;
    await w.burstThreadComments(burst);
    await waitMs(Math.floor(windowMs / 2));
    await sut.drainDeliveries();

    const insideWindow = countPairs(await sut.deliveries({ type: 'thread.comment' })).get(pair) ?? 0;
    expect(
      insideWindow,
      `${where}: burst of ${burst} inside the window delivered ${insideWindow}; the configuration prescribes ${expectedDelivered}`,
    ).toBe(expectedDelivered);

    await waitMs(windowMs);
    await w.burstThreadComments(1);
    await sut.drainDeliveries();

    const afterWindow = countPairs(await sut.deliveries({ type: 'thread.comment' })).get(pair) ?? 0;
    expect(
      afterWindow,
      `${where}: a comment ${windowMs}ms after the window was still suppressed — total ${afterWindow}, expected ${expectedDelivered + 1}`,
    ).toBe(expectedDelivered + 1);

    observed.push({ name: variant.name, delivered: insideWindow });
  }

  expect(
    new Set(observed.map((entry) => entry.delivered)).size,
    `the two configurations produced the same delivered count (${JSON.stringify(observed)}) — ` +
      `an implementation ignoring its configuration would pass this test`,
  ).toBe(variants.length);
}

/**
 * One physical catcher message as the provider-side trace the taxonomy capture stores.
 * `accepted` is the only outcome on this path. A message that arrived was accepted.
 */
export function traceFromCatcherMessage(message: {
  recipientId: string | null;
  eventId: string | null;
  channel: string | null;
}): { recipientId: string; eventId: string; channel: string; outcome: 'accepted' } {
  return {
    recipientId: message.recipientId ?? '',
    eventId: message.eventId ?? '',
    channel: message.channel ?? 'email',
    outcome: 'accepted',
  };
}

function physicalCountsByKey(
  messages: { id: string; key: string | null; eventId: string | null }[],
  eventId: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const message of messages) {
    if (message.eventId !== eventId) continue;
    const key = message.key ?? `unstamped:${message.id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * AT-016.11 above loop. The three clauses of the loop body, against the real stack.
 *
 * WHAT IS LIVE HERE THAT WAS NOT AT LOOP TIER: `h.vendors.email` does not exist, so the
 * rejection and the lost acknowledgment are armed at `notifications.provider_send`. The
 * provider-side outcomes come from the adapter's own record, because a refused or
 * unacknowledged send never arrives at the catcher. The catcher is the witness for one
 * thing only: how many physical messages exist per idempotency key after the retry.
 *
 * The retry physically reaches the provider. The lost-ack decorator sends, then lies, and
 * stores no receipt. The next pass calls the provider again; Mailpit's own store is what
 * answers the replay as already accepted and sends nothing.
 */
export async function at01611(ctx: Ctx): Promise<void> {
  const { h, w, sut } = await ctx.open();

  const attemptsFor = (eventId: string) => recordedProviderAttempts().filter((attempt) => attempt.eventId === eventId);
  const misdirected = (eventId: string) =>
    attemptsFor(eventId).filter((attempt) => attempt.recipientId !== w.actors.volunteer || attempt.channel !== 'email');

  const rejection = await h.faults.at(PROVIDER_FAULT_POINT, 'reject');
  const rejected = await w.fire('access.key_issued');
  try {
    await sut.drainDeliveries({ passes: 1 });
  } finally {
    await rejection.clear();
  }

  expect(
    attemptsFor(rejected.eventId).map((attempt) => attempt.outcome),
    'the provider was never asked to send — the rejection path was not exercised',
  ).toEqual(['rejected']);
  expect(
    misdirected(rejected.eventId),
    'the provider was handed a recipient or a channel this event never resolved to',
  ).toEqual([]);

  let event = (await sut.events({ type: 'access.key_issued' })).find((row) => row.id === rejected.eventId);
  expect(event, 'the notification event vanished after a provider rejection').toBeDefined();
  expect(['pending', 'retrying'], 'an unaccepted send was marked sent').toContain(event!.state);

  const unconfirmed = (await sut.deliveries({ type: 'access.key_issued' })).filter(
    (delivery) => delivery.eventId === rejected.eventId && delivery.channel === 'email',
  );
  expect(unconfirmed.length, 'the unconfirmed send was silently dropped — nothing observable remains').toBeGreaterThan(0);
  expect(unconfirmed.every((delivery) => delivery.state !== 'sent'), 'an unaccepted delivery is marked sent').toBe(true);

  const mailAfterReject = await messagesAddressedTo(Object.values(w.addresses));
  expect(
    [...physicalCountsByKey(mailAfterReject, rejected.eventId).values()],
    'a rejected send still produced a physical message',
  ).toEqual([]);

  await sut.drainDeliveries();
  const outcomes = attemptsFor(rejected.eventId).map((attempt) => attempt.outcome);
  expect(
    outcomes.length,
    `only ${outcomes.length} provider attempt(s) for a rejected send — no retry actually reached the provider`,
  ).toBeGreaterThanOrEqual(2);
  expect(outcomes[outcomes.length - 1], 'the retry did not end in provider acceptance').toBe('accepted');
  expect(
    misdirected(rejected.eventId),
    'the retry reached the provider carrying a recipient or a channel this event never resolved to',
  ).toEqual([]);

  event = (await sut.events({ type: 'access.key_issued' })).find((row) => row.id === rejected.eventId);
  expect(event!.state, 'the accepted send was never marked sent').toBe('sent');
  expect(event!.attempts, "the event's own attempt counter did not record the retry").toBeGreaterThanOrEqual(2);

  const lost = await h.faults.at(PROVIDER_FAULT_POINT, 'lose_ack');
  const ambiguous = await w.fire('access.key_revoked');
  try {
    await sut.drainDeliveries({ passes: 1 });
  } finally {
    await lost.clear();
  }

  expect(
    attemptsFor(ambiguous.eventId).map((attempt) => attempt.outcome),
    'the provider was not asked to send exactly once — the lost-ack path was not exercised as one attempt',
  ).toEqual(['ack_lost']);

  const unacked = (await sut.deliveries({ type: 'access.key_revoked' })).filter(
    (delivery) => delivery.eventId === ambiguous.eventId && delivery.channel === 'email',
  );
  expect(unacked.length, 'the lost-ack send left nothing observable at all').toBeGreaterThan(0);
  expect(
    unacked.every((delivery) => delivery.state !== 'sent'),
    'a send whose acknowledgment was lost was marked sent — the sender cannot tell that outcome from silence, so it must not',
  ).toBe(true);

  let ambiguousEvent = (await sut.events({ type: 'access.key_revoked' })).find((row) => row.id === ambiguous.eventId);
  expect(ambiguousEvent, 'the notification event vanished after a lost acknowledgment').toBeDefined();
  expect(['pending', 'retrying'], 'an unacknowledged send was marked sent').toContain(ambiguousEvent!.state);

  const mailAfterLost = await messagesAddressedTo(Object.values(w.addresses));
  expect(
    [...physicalCountsByKey(mailAfterLost, ambiguous.eventId).values()],
    'the lost-ack send did not leave exactly one physical message',
  ).toEqual([1]);

  await sut.drainDeliveries();
  expect(
    attemptsFor(ambiguous.eventId).map((attempt) => attempt.outcome),
    'the retry never reached the provider a second time',
  ).toEqual(['ack_lost', 'accepted']);
  ambiguousEvent = (await sut.events({ type: 'access.key_revoked' })).find((row) => row.id === ambiguous.eventId);
  expect(ambiguousEvent!.attempts, "the event's own attempt counter did not record the retry").toBeGreaterThanOrEqual(2);

  const logical = (await sut.events({ type: 'access.key_revoked' })).filter((row) => row.id === ambiguous.eventId);
  expect(logical.length, 'the retry minted a second logical notification').toBe(1);

  const want = expectedPairs(w.actors, ['volunteer'], ['email', 'inapp']);
  const deliveries = (await sut.deliveries({ type: 'access.key_revoked' })).filter((delivery) => delivery.eventId === ambiguous.eventId);
  expect(
    pairProblems(want, countPairs(deliveries)),
    'the lost-ack retry did not leave exactly one delivery per expected recipient-channel pair',
  ).toEqual([]);
  expect(
    deliveries.filter((delivery) => delivery.state !== 'sent'),
    'a delivery the provider accepted never reached the sent state',
  ).toEqual([]);

  const acceptedForEvent = recordedProviderAccepted().filter((attempt) => attempt.eventId === ambiguous.eventId);
  expect(
    pairProblems(expectedPairs(w.actors, ['volunteer'], ['email']), countPairs(acceptedForEvent)),
    'the pairs the provider physically accepted are not exactly the pairs this event resolved to',
  ).toEqual([]);

  const mail = await messagesAddressedTo(Object.values(w.addresses));
  expect(
    [...physicalCountsByKey(mail, rejected.eventId).values()],
    'the rejected send did not leave exactly one physical message per idempotency key after the retry',
  ).toEqual([1]);
  expect(
    [...physicalCountsByKey(mail, ambiguous.eventId).values()],
    'the lost-ack send did not leave exactly one physical message per idempotency key after the retry',
  ).toEqual([1]);
}
