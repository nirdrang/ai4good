/**
 * A CONFORMING REFERENCE STAND-IN of REQ-016's notification system — not the product.
 *
 * REQ-016 is not implemented. This adapter is what the loop tier runs the suite against, and it
 * is derived from the suite's OWN specification oracle (`taxonomy.ts`): it registers exactly the
 * rows the table names, resolves recipients the way the table says, and applies the delivery
 * defaults the requirement states. That makes it a conformant implementation by construction,
 * which is the whole point and also the whole limitation.
 *
 * SO WHAT A LOOP-TIER GREEN MEANS: the test machinery and the oracles run end-to-end against an
 * implementation that conforms — the assertions execute, the fixtures build, the evidence captures
 * freeze, the oracles discriminate. It does NOT mean the product behaves, because there is no
 * product here; an assertion this adapter satisfies says nothing about code nobody has written.
 *
 * That claim is not left to a comment to enforce, and it is no longer left to a LABEL either. Every
 * key this module exports under `sut` is registered on the provenance ledger through the harness's
 * adapter-derived route, whose evidence is the module URL the loader actually imported — this file.
 * There is no function a caller can call to name that provenance something else, and the registry
 * refuses ANY stubbed capability above the loop tier, so this adapter cannot reach the
 * integration-tier run that is the evidence gate.
 *
 * What that is worth, stated exactly: the gate cannot be satisfied by relabelling this adapter, and
 * it takes a visible edit to a named witness in `harness/capabilities.ts` — not a one-word change
 * at a call site — to make it look otherwise. The harness is still source code, so this is a bound
 * on how cheap the lie is, not a proof that none is possible.
 */

import type { ControlledClock } from '../../harness/clock.ts';
import type { AdapterFaultSeam, ArmedFault, FaultKind } from '../../harness/faults.ts';
import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
import type { AdapterSentinelSeam } from '../../harness/sentinels.ts';
import type { EmailProviderPort } from '../../harness/vendors.ts';
import type {
  ConfigRegistry,
  Delivery,
  DocumentedDefault,
  EmitResult,
  NotificationEvent,
  NotificationsSut,
  OpsItem,
  RegisteredRow,
  World,
} from './_contract.ts';
import { TAXONOMY, type Channel, type Role, type TaxonomyRow } from './taxonomy.ts';

/**
 * WHICH REQUIREMENT THIS ADAPTER IS, declared by the adapter itself.
 *
 * Three facts used to be independent: the key `harness/suite-adapters.ts` looks the types up under,
 * the module those types are read from, and the module `loadAdapter()` imports at run time from a
 * path it builds out of a string. A typo in any one of them would have let the type-check describe
 * one suite while the run drove another, with nothing able to notice. This literal is what ties
 * them together — the map entry is constrained to match it, and `loadAdapter()` re-checks it
 * against the requirement it was asked for and throws naming both values.
 */
export const requirement = 'req-016' as const;

interface AdapterOptions {
  clock: ControlledClock;
  worlds: FixtureWorldStore;
  config: ConfigRegistry;
  /** The harness's email provider seam — the only vendor this requirement's deliveries reach. */
  vendors: { email: EmailProviderPort };
}

/**
 * THE FAULT POINT, and its name is a claim about where it sits.
 *
 * `emitKnown` below commits the state transition, reaches this point, and only then writes the
 * notification event — in that order, because the point's name says so. The order used to be the
 * other way round, and renaming the point to fit the code would have been exactly the
 * declared-versus-real drift this way of work exists to delete, so the writes moved instead.
 */
const FAULT_POINT = 'notifications.between_transition_and_event_write';

/** The one store a sentinel scan can search here: the copy actually delivered to a recipient. */
const SENTINEL_SCOPE = 'notifications.delivery_bodies';

/** The at-config keys the thread-comment anti-spam guard is configured by. */
const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';
const GUARD_COALESCE_KEY = 'req-015.thread_comment_notifications.coalesce';

interface MutableState {
  events: NotificationEvent[];
  deliveries: Delivery[];
  opsItems: OpsItem[];
  transitions: Map<string, boolean>;
  nextId: number;
}

const SENDERS = [
  { component: 'notifications.emitter', canSendDirectly: true },
  { component: 'blockers.service', canSendDirectly: false },
  { component: 'scope.service', canSendDirectly: false },
  { component: 'lifecycle.service', canSendDirectly: false },
];

function channelsFor(row: TaxonomyRow): Channel[] {
  if (row.channels) return [...row.channels];
  if (row.class === 'lowtone') return ['inapp'];
  if (['money', 'deadline', 'blocker', 'completion', 'decision'].includes(row.class)) return ['email'];
  return ['inapp'];
}

function defaults(): DocumentedDefault[] {
  return TAXONOMY.map((row) => ({
    event: row.event,
    channels: channelsFor(row),
    source: row.channels ? `REQ-016 taxonomy row ${row.event}` : `REQ-016 documented ${row.class} delivery default`,
  }));
}

function payloadFor(row: TaxonomyRow, params: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...params };
  const named: Record<string, unknown> = {
    marketplaceVisibility: true,
    reason: 'The scope needs a clearer measurable outcome',
    consentCta: 'Confirm consent',
    fundToKickOff: 'Fund to kick off',
    replacementOnDashboard: 'Find the replacement on your dashboard',
    whatToDoInstead: 'Use the supported status command to continue',
    // d89 decline-then-review rows
    declineCause: 'ongoing_developer_maintenance',
    reshapingSuggestion: 'Consider reshaping this as a staffer-maintainable intake tool',
    oversightSentence: 'A person reads every decline; if we got it wrong, we will reach out',
    discoveryReopened: true,
  };
  for (const key of row.payloadKeys ?? []) payload[key] = named[key] ?? `${row.event} ${key}`;
  return payload;
}

function bodyFor(row: TaxonomyRow, payload: Record<string, unknown>): string {
  const carried = Object.values(payload)
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  const base =
    row.event === 'leftover.released'
      ? 'Unused fuel was released to the NGO general balance.'
      : `${row.event.replaceAll(/[._]/g, ' ')} notification.`;
  return `${base}${carried ? ` ${carried}` : ''}`;
}

class NotificationFixtureWorld implements World {
  readonly actors: Record<Role, string>;

  constructor(
    private readonly base: FixtureWorld,
    private readonly emitKnown: (
      world: NotificationFixtureWorld,
      event: string,
      params?: Record<string, unknown>,
    ) => Promise<{ eventId: string }>,
    private readonly burstComments: (world: NotificationFixtureWorld, count: number) => Promise<void>,
    private readonly state: MutableState,
  ) {
    this.actors = base.state.actors;
  }

  async fire(event: string, params: Record<string, unknown> = {}): Promise<{ eventId: string }> {
    this.base.assertActive();
    return this.emitKnown(this, event, params);
  }

  async transitionCommitted(event: string): Promise<boolean> {
    this.base.assertActive();
    return this.state.transitions.get(event) ?? false;
  }

  async reassignRole(role: Role, toActorId: string): Promise<string> {
    this.base.assertActive();
    this.actors[role] = toActorId;
    return toActorId;
  }

  async burstThreadComments(count: number): Promise<void> {
    this.base.assertActive();
    await this.burstComments(this, count);
  }

  async teardown(): Promise<void> {
    await this.base.teardown();
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createFixtureAdapter({ clock, worlds, config, vendors }: AdapterOptions) {
  const state: MutableState = {
    events: [],
    deliveries: [],
    opsItems: [],
    transitions: new Map(),
    nextId: 1,
  };
  const openedWorlds = new Set<NotificationFixtureWorld>();
  let currentWorld: NotificationFixtureWorld | null = null;
  let commentWindowStart: number | null = null;
  let commentsInWindow = 0;
  let coalescedInWindow = false;

  /*
   * THE DELIVERY PROCESS'S IDENTITY, and the armed faults it can be interrupted by.
   *
   * There was no process here to restart: `drainDeliveries` is a synchronous sweep with no
   * lifecycle, and `state.nextId` counts events, not processes. So an identity is introduced,
   * `processRestart()` changes it, and `processEpochProblem` in the harness refuses a restart that
   * left it unchanged — otherwise "survives a restart" is a claim about a process that never
   * stopped. Durable state deliberately SURVIVES the change: AT-016.07 asserts, after the restart,
   * that exactly one logical event and one delivery per recipient-channel pair remain, and a
   * restart that cleared them would fail that, correctly.
   */
  let epochSeq = 1;
  let processEpoch = `delivery-process-${epochSeq}`;
  const armedFaults = new Map<string, { count: number }>();

  /**
   * Execution has REACHED a fault point. THE COUNT IS INCREMENTED HERE AND NOWHERE ELSE — arming
   * happens in `arm()` below and adds nothing to it, which is the difference between an atomicity
   * test that proves something and one that passes on a fault that never happened.
   */
  const reachFaultPoint = (point: string): void => {
    const armed = armedFaults.get(point);
    if (!armed) return;
    armed.count += 1;
    throw new Error(`induced fault: crash at ${point}`);
  };

  const faults: AdapterFaultSeam = {
    points: () => [FAULT_POINT],
    arm: (point: string, kind: FaultKind): ArmedFault => {
      // A point that silently accepted a kind it does not implement would arm nothing while
      // reporting a trigger, and the atomicity oracle would read the result as proof.
      if (kind !== 'crash') {
        throw new Error(
          `fault point ${JSON.stringify(point)} implements no ${JSON.stringify(kind)} fault — it implements: crash`,
        );
      }
      const armed = { count: 0 };
      armedFaults.set(point, armed);
      return {
        triggerCount: () => armed.count,
        disarm: () => {
          if (armedFaults.get(point) === armed) armedFaults.delete(point);
        },
      };
    },
    processEpoch: () => processEpoch,
    processRestart: () => {
      processEpoch = `delivery-process-${++epochSeq}`;
    },
  };

  const sentinels: AdapterSentinelSeam = {
    scopes: () => [SENTINEL_SCOPE],
    read: () => state.deliveries.map((delivery) => delivery.body),
  };

  const emitKnown = async (
    world: NotificationFixtureWorld,
    event: string,
    params: Record<string, unknown> = {},
  ): Promise<{ eventId: string }> => {
    const row = TAXONOMY.find((candidate) => candidate.event === event);
    if (!row) throw new Error(`fixture cannot fire unregistered notification event ${JSON.stringify(event)}`);
    const channels = channelsFor(row);
    const payload = payloadFor(row, params);
    const recipients = row.recipients.map((role) => ({
      role,
      recipientId: world.actors[role],
      channels: [...channels],
    }));
    // (1) THE TRANSITION COMMITS FIRST, (2) the fault point, (3) the event write and everything
    // that belongs to it. That order is what the point's name asserts.
    //
    // ONE ROLLBACK UNIT, and the list is exhaustive: the transition is the only thing committed
    // before the point, and a crash there puts it back the way it was. Restoring the PREVIOUS value
    // rather than deleting the key matters — an earlier firing of the same event legitimately left
    // one behind, and deleting it would report "the transition never happened" about a transition
    // that did. Everything else — the id, the event, the deliveries, the ops item — is allocated or
    // written only after the point, so a crash has nothing of theirs to undo.
    const transitionBefore = state.transitions.get(event);
    state.transitions.set(event, true);
    try {
      reachFaultPoint(FAULT_POINT);
    } catch (fault) {
      if (transitionBefore === undefined) state.transitions.delete(event);
      else state.transitions.set(event, transitionBefore);
      throw fault;
    }

    // ALLOCATED AFTER THE POINT, deliberately. This used to run before it, so a crash consumed an
    // id for an event that never existed and a later firing observed `event-2` with no `event-1` —
    // a third side effect the rollback did not undo while the comment above called itself one unit.
    // Removing the side effect is a stronger repair than compensating for it in the catch.
    const eventId = `event-${state.nextId++}`;
    state.events.push({
      id: eventId,
      type: event,
      recipients: clone(recipients),
      state: 'pending',
      attempts: 0,
    });
    for (const recipient of recipients) {
      for (const channel of recipient.channels) {
        state.deliveries.push({
          eventId,
          type: event,
          role: recipient.role,
          recipientId: recipient.recipientId,
          channel,
          state: 'pending',
          emittedBy: 'notifications.emitter',
          // Nothing has sent this yet, so no process owns it. `drainDeliveries` stamps the
          // identity of the process that actually performed the send.
          deliveredByProcess: null,
          payload: clone(payload),
          body: bodyFor(row, payload),
        });
      }
    }
    if (row.opsItem) {
      state.opsItems.push({ id: `ops-${eventId}`, kind: row.event, linkedEventId: eventId });
    }
    return { eventId };
  };

  /**
   * A DELIVERY BECOMES `sent`, and the process that did it owns the stamp.
   *
   * THE DELIVERY PATH READS THE PROCESS IDENTITY. Every send is stamped with the identity of the
   * process that performed it, which is what makes `processRestart()` causal rather than decorative:
   * before this, nothing on this path consulted `processEpoch` at all, so deleting the restart from
   * AT-016.07 changed no outcome and the green was bought with nothing.
   *
   * THE FIRST SEND OWNS THE STAMP. Re-stamping would record the identity of the LAST drain instead
   * of the process that actually performed the send, so a delivery completed before a restart would
   * silently acquire the post-restart identity — and `_contract.ts` claims the opposite about this
   * field, that a send after a restart carries a different string than one before it. `null` is
   * exactly "no process has sent this yet", which is why it, and not the delivery's state, is what
   * the guard reads.
   */
  const markSent = (delivery: Delivery): void => {
    if (delivery.deliveredByProcess === null) delivery.deliveredByProcess = processEpoch;
    delivery.state = 'sent';
  };

  /**
   * ONE WORKER PASS — and the provider, not the worker, decides whether an email send is done.
   *
   * This used to mark every delivery `sent` unconditionally, which made "sent only on provider
   * acceptance" untestable: there was no seam to accept or refuse anything. Now an email delivery is
   * `sent` ONLY on `'accepted'`; `'rejected'` (a stated refusal) and `'no_ack'` (silence) both leave
   * it `retrying` for a later pass. The sender cannot tell `'no_ack'` from a provider that accepted
   * and lost the acknowledgment — that is the point — so it retries, and the provider's own
   * idempotency is what stops the retry minting a duplicate.
   */
  const runDeliveryPass = (): void => {
    const attemptedEvents = new Set<string>();

    for (const delivery of state.deliveries) {
      if (delivery.state === 'sent') continue;
      attemptedEvents.add(delivery.eventId);

      // IN-APP NEVER REACHES THE PROVIDER: there is no email provider in the path of an in-app
      // notification, so consulting one would record a send at the seam that never happened — and
      // AT-016.01's provider-side trace reads exactly that set.
      if (delivery.channel !== 'email') {
        markSent(delivery);
        continue;
      }

      const outcome = vendors.email.deliver({
        recipientId: delivery.recipientId,
        eventId: delivery.eventId,
        channel: delivery.channel,
      });
      if (outcome === 'accepted') markSent(delivery);
      else delivery.state = 'retrying';
    }

    // An event the pass did not touch is left exactly as it was: its attempt counter must count
    // attempts, and an event whose deliveries were all already sent was not attempted again.
    for (const event of state.events) {
      if (!attemptedEvents.has(event.id)) continue;
      event.attempts += 1;
      event.state = state.deliveries.some((delivery) => delivery.eventId === event.id && delivery.state !== 'sent')
        ? 'retrying'
        : 'sent';
    }
  };

  const sut: NotificationsSut = {
    senders: async () => clone(SENDERS),
    taxonomy: async (): Promise<RegisteredRow[]> =>
      TAXONOMY.map((row) => ({
        event: row.event,
        recipients: [...row.recipients],
        channels: row.channels ? [...row.channels] : null,
        tone: row.tone,
      })),
    documentedDefaults: async () => clone(defaults()),
    runtimeRegistrationSurface: async () => [],
    emit: async (request): Promise<EmitResult> => {
      const row = TAXONOMY.find((candidate) => candidate.event === request.type);
      if (!row) return { accepted: false, reason: 'unregistered event type' };
      if (!currentWorld) return { accepted: false, reason: 'no fixture world is open' };
      const { eventId } = await emitKnown(currentWorld, request.type, request.ctx);
      return { accepted: true, eventId };
    },
    events: async (filter) => clone(state.events.filter((event) => !filter?.type || event.type === filter.type)),
    deliveries: async (filter) => clone(state.deliveries.filter((delivery) => !filter?.type || delivery.type === filter.type)),
    opsItems: async (filter) =>
      clone(state.opsItems.filter((item) => !filter?.linkedEventId || item.linkedEventId === filter.linkedEventId)),
    drainDeliveries: async (opts) => {
      // DEFAULT = TO QUIESCENCE, WITH NO PASS CAP, and the termination argument is structural rather
      // than a number: each pass either transitions a delivery to `sent` or consumes one forced
      // outcome from the simulator's FINITE queue, and once that queue is empty every email send is
      // accepted — or idempotency-replayed as accepted — so the loop is bounded by the queue length
      // plus one. A cap would contradict `_contract.ts`'s "default = to quiescence" for any test
      // that armed more forced failures than the cap allowed passes, which is a reachable scenario.
      //
      // `passes` bounds the worker so a test can observe the state BETWEEN attempts: AT-016.11's
      // "the unconfirmed send is observable as pending/retrying" is unobservable if every drain runs
      // to quiescence.
      //
      // AND A `passes` THAT IS NOT A WHOLE NUMBER OF PASSES IS REFUSED, never interpreted. The
      // loop's guard is `pass >= limit`, and that quietly gave three different meanings to three
      // nonsense values: `0` ran no pass at all while reading as "one bounded pass", `1.5` ran two,
      // and `NaN` — where every comparison is false — ran to quiescence, which is the opposite of
      // bounding anything. A test that asked for a bounded drain and silently got an unbounded one
      // observes the state AFTER the retry it meant to catch the system between.
      const limit = opts?.passes;
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
        throw new Error(
          `drainDeliveries refuses passes=${String(limit)} — a pass budget must be a whole number of ` +
            `worker passes, at least 1; anything else bounds the drain by something other than what the test asked for`,
        );
      }
      let pass = 0;
      while (state.deliveries.some((delivery) => delivery.state !== 'sent')) {
        if (limit !== undefined && pass >= limit) break;
        pass += 1;
        runDeliveryPass();
      }
    },
  };

  return {
    sut: { notifications: sut },
    faults,
    sentinels,
    fixtures: {
      world: async (name: string) => {
        const base = await worlds.world(name);
        const burstComments = async (world: NotificationFixtureWorld, count: number) => {
          // Read at guard-evaluation time, not at construction: the configuration is what this
          // world was opened with, and a value captured once could not be re-tuned per world.
          const cap = config.get<number>(GUARD_CAP_KEY);
          const windowMs = config.get<number>(GUARD_WINDOW_KEY);
          const coalesce = config.get<boolean>(GUARD_COALESCE_KEY);

          const now = clock.now();
          if (commentWindowStart === null || now - commentWindowStart >= windowMs) {
            commentWindowStart = now;
            commentsInWindow = 0;
            coalescedInWindow = false;
          }
          for (let index = 0; index < count; index++) {
            if (coalesce) {
              // Coalescing: the whole burst becomes ONE notification for the window.
              if (!coalescedInWindow) {
                await emitKnown(world, 'thread.comment');
                coalescedInWindow = true;
              }
            } else if (commentsInWindow < cap) {
              await emitKnown(world, 'thread.comment');
            }
            commentsInWindow += 1;
          }
        };
        const world = new NotificationFixtureWorld(base, emitKnown, burstComments, state);
        openedWorlds.add(world);
        currentWorld = world;
        return world;
      },
    },
    teardown: async () => {
      await Promise.all([...openedWorlds].map((world) => world.teardown()));
      openedWorlds.clear();
      currentWorld = null;
      state.events.length = 0;
      state.deliveries.length = 0;
      state.opsItems.length = 0;
      state.transitions.clear();
      armedFaults.clear();
      commentWindowStart = null;
      commentsInWindow = 0;
      coalescedInWindow = false;
    },
  };
}
