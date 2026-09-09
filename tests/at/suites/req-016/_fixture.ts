/**
 * REQ-016's LOOP BINDING of the notification core, in memory, against the harness's provider
 * simulator.
 *
 * the emitter, the taxonomy, the documented defaults, the copy and the delivery worker are the
 * product's, in `supabase/functions/_shared/notifications.ts` and the modules beside it, and this
 * file binds their six ports to memory: an outbox that is three arrays, a provider that is the
 * harness's email simulator, a directory that is the fixture world's actors, a controlled clock
 * and a process identity a restart can change. The live adapter in `_live.ts` binds the same six
 * ports to the local stack. A loop green and an integration green run the same core.
 *
 * WHAT A LOOP GREEN MEANS NOW: the product's decisions are right against the suite's oracles. What
 * it does not mean: that the schema, the definers, the SMTP path or row-level security behave,
 * because none of them is on this path. That is the integration tier's claim.
 *
 * THE FAULT POINT IS REACHED INSIDE `append`, between the transition and the write, because that
 * is where the name says it sits and where the live producer definer raises it. The core never
 * learns that faults exist; a fault is an adapter that misbehaves.
 */

import type { ControlledClock } from '../../harness/clock.ts';
import type { AdapterFaultSeam } from '../../harness/faults.ts';
import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
import type { AdapterSentinelSeam } from '../../harness/sentinels.ts';
import type { EmailProviderPort } from '../../harness/vendors.ts';
import {
  createNotifications,
  TAXONOMY_PORT,
  type DeliveryRow,
  type DirectoryPort,
  type NotificationEventRow,
  type Notifications,
  type OpsItemRow,
  type OutboxPort,
  type ProviderPort,
  type RoleHolder,
} from '../../../../supabase/functions/_shared/notifications.ts';
import type { ConfigRegistry, EmitResult, NotificationsSut, World } from './_contract.ts';
import { createCrashSwitch } from './_fault-switch.ts';
import { producerPayload } from './_fixture-producers.ts';
import type { Role } from './taxonomy.ts';

/**
 * WHICH REQUIREMENT THIS ADAPTER IS, declared by the adapter itself.
 *
 * Three facts used to be independent: the key `harness/suite-adapters.ts` looks the types up under,
 * the module those types are read from, and the module `loadAdapter()` imports at run time from a
 * path it builds out of a string. A typo in any one of them would have let the type-check describe
 * one suite while the run drove another, with nothing able to notice. This literal is what ties
 * them together: the map entry is constrained to match it, and `loadAdapter()` re-checks it
 * against the requirement it was asked for and throws naming both values.
 */
export const requirement = 'req-016' as const;

interface AdapterOptions {
  clock: ControlledClock;
  worlds: FixtureWorldStore;
  config: ConfigRegistry;
  /** The harness's email provider seam, the only vendor this requirement's deliveries reach. */
  vendors: { email: EmailProviderPort };
}

/**
 * THE FAULT POINT, and its name is a claim about where it sits.
 *
 * `append` below commits the state transition, reaches this point, and only then writes the
 * notification event, in that order, because the point's name says so.
 */
const FAULT_POINT = 'notifications.between_transition_and_event_write';

/** The one store a sentinel scan can search here: the copy actually delivered to a recipient. */
const SENTINEL_SCOPE = 'notifications.delivery_bodies';

/** The at-config keys the thread-comment anti-spam guard is configured by. */
const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';
const GUARD_COALESCE_KEY = 'req-015.thread_comment_notifications.coalesce';

const ROLES: readonly Role[] = ['ngo', 'volunteer', 'ex_volunteer', 'platform_admin'];

/** A delivery as the memory outbox holds it: the row the suite reads plus what a send needs. */
type StoredDelivery = DeliveryRow & {
  id: string;
  address: string | null;
  subject: string;
  idempotencyKey: string;
};

interface MutableState {
  events: NotificationEventRow[];
  deliveries: StoredDelivery[];
  opsItems: OpsItemRow[];
  transitions: Map<string, boolean>;
  nextId: number;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/** The addresses this world's actors are reached at, namespaced by the world's name. */
function addressesFor(name: string, actors: Record<Role, string>): Record<Role, string> {
  const namespace = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const addresses = {} as Record<Role, string>;
  for (const role of ROLES) addresses[role] = `${actors[role]}@${namespace}.example.test`;
  return addresses;
}

/** Fire a registered event through the core, as the fixture producer for its domain. */
async function fireThroughCore(core: Notifications, event: string, params: Record<string, unknown>): Promise<{ eventId: string }> {
  const outcome = await core.emit({ event, actor: null, params: producerPayload(event, params) });
  if (!outcome.accepted) throw new Error(`fixture cannot fire unregistered notification event ${JSON.stringify(event)}: ${outcome.reason}`);
  return { eventId: outcome.eventId };
}

class NotificationFixtureWorld implements World {
  readonly actors: Record<Role, string>;
  readonly addresses: Record<Role, string>;

  constructor(
    private readonly base: FixtureWorld,
    private readonly core: Notifications,
    private readonly burstComments: (world: NotificationFixtureWorld, count: number) => Promise<void>,
    private readonly state: MutableState,
  ) {
    this.actors = base.state.actors;
    this.addresses = addressesFor(base.name, base.state.actors);
  }

  async fire(event: string, params: Record<string, unknown> = {}): Promise<{ eventId: string }> {
    this.base.assertActive();
    return fireThroughCore(this.core, event, params);
  }

  async transitionCommitted(event: string): Promise<boolean> {
    this.base.assertActive();
    return this.state.transitions.get(event) ?? false;
  }

  async reassignRole(role: Role, toActorId: string): Promise<string> {
    this.base.assertActive();
    this.actors[role] = toActorId;
    this.addresses[role] = `${toActorId}@${this.addresses[role].split('@')[1]}`;
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

  /*
   * THE DELIVERY PROCESS'S IDENTITY, and the armed faults it can be interrupted by.
   *
   * `processRestart()` changes the identity, and `processEpochProblem` in the harness refuses a
   * restart that left it unchanged; otherwise "survives a restart" is a claim about a process that
   * never stopped. Durable state deliberately SURVIVES the change: AT-016.07 asserts, after the
   * restart, that exactly one logical event and one delivery per recipient-channel pair remain.
   */
  let epochSeq = 1;
  let processEpoch = `delivery-process-${epochSeq}`;

  /**
   * In memory the binding is the code path, so the reach it records in `append` is the one witness
   * there can be. THE COUNT IS INCREMENTED AT THE REACH AND NOWHERE ELSE; arming adds nothing to
   * it, which is the difference between an atomicity test that proves something and one that
   * passes on a fault that never happened.
   */
  const crash = createCrashSwitch(
    FAULT_POINT,
    () => ({ reaches: 0 }),
    (ledger) => ledger.reaches,
  );

  const faults: AdapterFaultSeam = {
    points: () => [FAULT_POINT],
    arm: (_point, kind) => crash.arm(kind),
    processEpoch: () => processEpoch,
    processRestart: () => {
      processEpoch = `delivery-process-${++epochSeq}`;
    },
  };

  const sentinels: AdapterSentinelSeam = {
    scopes: () => [SENTINEL_SCOPE],
    read: () => state.deliveries.map((delivery) => delivery.body),
  };

  const projectDelivery = (delivery: StoredDelivery): DeliveryRow => ({
    eventId: delivery.eventId,
    type: delivery.type,
    role: delivery.role,
    recipientId: delivery.recipientId,
    channel: delivery.channel,
    state: delivery.state,
    emittedBy: delivery.emittedBy,
    deliveredByProcess: delivery.deliveredByProcess,
    payload: clone(delivery.payload),
    body: delivery.body,
  });

  /**
   * THE MEMORY OUTBOX. `append` is the loop tier's one transaction: (1) the transition commits
   * first, (2) the fault point, (3) the event write and everything that belongs to it.
   *
   * ONE ROLLBACK UNIT, and the list is exhaustive: the transition is the only thing committed
   * before the point, and a crash there puts it back the way it was. Restoring the PREVIOUS value
   * rather than deleting the key matters: an earlier firing of the same event legitimately left one
   * behind. The id, the event, the deliveries and the ops item are allocated or written only after
   * the point, so a crash has nothing of theirs to undo, and `conformance.selftest.ts` asserts that
   * the survivor of a crashed emit is still `event-1`.
   */
  const outbox: OutboxPort = {
    append: async (write) => {
      const event = write.event.event;
      const transitionBefore = state.transitions.get(event);
      state.transitions.set(event, true);
      const armed = crash.armed();
      if (armed) {
        if (transitionBefore === undefined) state.transitions.delete(event);
        else state.transitions.set(event, transitionBefore);
        armed.reaches += 1;
        throw new Error(`induced fault: crash at ${FAULT_POINT}`);
      }

      const eventId = `event-${state.nextId++}`;
      state.events.push({
        id: eventId,
        type: event,
        recipients: write.event.recipients.map((recipient) => ({
          role: recipient.role,
          recipientId: recipient.recipientId,
          channels: [...recipient.channels],
        })),
        state: 'pending',
        attempts: 0,
      });
      for (const delivery of write.deliveries) {
        state.deliveries.push({
          id: `delivery-${state.deliveries.length + 1}`,
          eventId,
          type: event,
          role: delivery.role,
          recipientId: delivery.recipientId,
          channel: delivery.channel,
          state: 'pending',
          emittedBy: delivery.emittedBy,
          deliveredByProcess: null,
          payload: clone(delivery.payload),
          body: delivery.body,
          address: delivery.address,
          subject: delivery.subject,
          idempotencyKey: `ntf:${eventId}:${delivery.recipientId}:${delivery.channel}`,
        });
      }
      if (write.opsItem) {
        state.opsItems.push({ id: `ops-${eventId}`, kind: write.opsItem.kind, linkedEventId: eventId });
      }
      return { eventId };
    },

    pending: async () =>
      state.deliveries
        .filter((delivery) => delivery.state !== 'sent')
        .map((delivery) => ({
          id: delivery.id,
          eventId: delivery.eventId,
          recipientId: delivery.recipientId,
          address: delivery.address,
          channel: delivery.channel,
          subject: delivery.subject,
          body: delivery.body,
          idempotencyKey: delivery.idempotencyKey,
        })),

    /**
     * THE FIRST SEND OWNS THE STAMP. Re-stamping would record the identity of the LAST drain instead
     * of the process that actually performed the send, and `_contract.ts` promises the opposite about
     * `deliveredByProcess`. `null` is exactly "no process has sent this yet".
     */
    applyPassResults: async (results, epoch) => {
      const touched = new Set<string>();
      for (const result of results) {
        const delivery = state.deliveries.find((candidate) => candidate.id === result.id);
        if (!delivery) throw new Error(`the worker reported a result for delivery ${result.id}, which the outbox does not hold`);
        if (result.outcome === 'accepted') {
          if (delivery.deliveredByProcess === null) delivery.deliveredByProcess = epoch;
          delivery.state = 'sent';
        } else {
          delivery.state = 'retrying';
        }
        touched.add(delivery.eventId);
      }
      for (const event of state.events) {
        if (!touched.has(event.id)) continue;
        event.attempts += 1;
        event.state = state.deliveries.some((delivery) => delivery.eventId === event.id && delivery.state !== 'sent')
          ? 'retrying'
          : 'sent';
      }
    },

    events: async (filter) => clone(state.events.filter((event) => !filter?.type || event.type === filter.type)),
    deliveries: async (filter) =>
      state.deliveries.filter((delivery) => !filter?.type || delivery.type === filter.type).map(projectDelivery),
    opsItems: async (filter) =>
      clone(state.opsItems.filter((item) => !filter?.linkedEventId || item.linkedEventId === filter.linkedEventId)),
  };

  /** The harness's simulator, behind the product's port. Its trace is the out-of-band witness. */
  const provider: ProviderPort = {
    deliver: async (message) => ({
      outcome: vendors.email.deliver({ recipientId: message.recipientId, eventId: message.eventId, channel: message.channel }),
      receipt: null,
    }),
  };

  /** The open world's actors, read at EMIT time. A reassigned role is visible to the next emit only. */
  const directory: DirectoryPort = {
    resolve: async (roles) => {
      if (!currentWorld) throw new Error('no fixture world is open, so there is nobody to resolve a recipient role to');
      const holders: Partial<Record<Role, RoleHolder>> = {};
      for (const role of roles) {
        holders[role] = { recipientId: currentWorld.actors[role], address: currentWorld.addresses[role] };
      }
      return holders;
    },
  };

  const core = createNotifications({
    taxonomy: TAXONOMY_PORT,
    outbox,
    provider,
    directory,
    clock: { now: () => clock.now() },
    process: { epoch: () => processEpoch },
  });

  const sut: NotificationsSut = {
    senders: async () => core.senders(),
    taxonomy: async () => core.taxonomy(),
    documentedDefaults: async () => core.documentedDefaults(),
    runtimeRegistrationSurface: async () => core.runtimeRegistrationSurface(),
    emit: async (request): Promise<EmitResult> =>
      core.emit({ event: request.type, actor: null, params: producerPayload(request.type, request.ctx) }),
    events: (filter) => core.events(filter),
    deliveries: (filter) => core.deliveries(filter),
    opsItems: (filter) => core.opsItems(filter),
    drainDeliveries: (opts) => core.drain(opts),
  };

  return {
    sut: { notifications: sut },
    faults,
    sentinels,
    fixtures: {
      world: async (name: string) => {
        const base = await worlds.world(name);
        const guard = core.threadCommentGuard({
          cap: config.get<number>(GUARD_CAP_KEY),
          windowMs: config.get<number>(GUARD_WINDOW_KEY),
          coalesce: config.get<boolean>(GUARD_COALESCE_KEY),
        });
        const burstComments = async (world: NotificationFixtureWorld, count: number) => {
          for (let index = 0; index < count; index++) {
            if (guard.allow()) await world.fire('thread.comment');
          }
        };
        const world = new NotificationFixtureWorld(base, core, burstComments, state);
        openedWorlds.add(world);
        currentWorld = world;
        return world;
      },
    },
    teardown: async () => {
      await Promise.all([...openedWorlds].map((world) => world.teardown()));
      openedWorlds.clear();
      currentWorld = null;
    },
  };
}
