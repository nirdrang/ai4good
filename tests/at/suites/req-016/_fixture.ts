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

export const requirement = 'req-016' as const;

interface AdapterOptions {
  clock: ControlledClock;
  worlds: FixtureWorldStore;
  config: ConfigRegistry;
  vendors: { email: EmailProviderPort };
}

const FAULT_POINT = 'notifications.between_transition_and_event_write';

const SENTINEL_SCOPE = 'notifications.delivery_bodies';

const GUARD_CAP_KEY = 'req-015.thread_comment_notifications.max_per_window';
const GUARD_WINDOW_KEY = 'req-015.thread_comment_notifications.window_ms';
const GUARD_COALESCE_KEY = 'req-015.thread_comment_notifications.coalesce';

const ROLES: readonly Role[] = ['ngo', 'volunteer', 'ex_volunteer', 'platform_admin'];

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

function addressesFor(name: string, actors: Record<Role, string>): Record<Role, string> {
  const namespace = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const addresses = {} as Record<Role, string>;
  for (const role of ROLES) addresses[role] = `${actors[role]}@${namespace}.example.test`;
  return addresses;
}

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

  let epochSeq = 1;
  let processEpoch = `delivery-process-${epochSeq}`;

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

  const provider: ProviderPort = {
    deliver: async (message) => ({
      outcome: vendors.email.deliver({ recipientId: message.recipientId, eventId: message.eventId, channel: message.channel }),
      receipt: null,
    }),
  };

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
