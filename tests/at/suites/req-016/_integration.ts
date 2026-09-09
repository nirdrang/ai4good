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
 * ONE BODY HERE REFUSES RATHER THAN ASSERTS, and it names the capability that is missing. That is
 * not a stub and it is not a skip: the refusal is a `CapabilityPending` carrying an exact name, so
 * the id is RED in a shape the declaration machinery matches from position 0. AT-016.08's loop
 * body commands the harness clock, which above loop is the passage of time and has no command
 * seam, so its first failing call would be a TypeError no declaration can describe. Until the unit
 * that lands the anti-spam guard writes the real procedure, this one says by name what is missing.
 */

import { expect } from 'vitest';

import type { Sentinels } from '../../harness/contracts.ts';
import { CapabilityPending } from '../../harness/registry.ts';
import type { AtContext as HarnessAtContext } from '../../harness/registry.ts';
import type { NotificationsSut, World } from './_contract.ts';
import { messagesAddressedTo } from './_mail-witness.ts';
import { providerClientImporters, strayNotificationWriters } from './_source-scan.ts';

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

/**
 * A body that refuses by name, opening a world first so the seam it stands in for is really the
 * one that is absent. The same shape as the auth suite's refusing bodies.
 */
function refusesWith(capability: string): (ctx: Ctx) => Promise<void> {
  return async (ctx: Ctx): Promise<void> => {
    await ctx.open();
    throw new CapabilityPending([capability]);
  };
}

/** AT-016.08 above loop: the anti-spam guard's live procedure is a later unit's. */
export const at01608 = refusesWith('fixtures.world.burstThreadComments');

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
