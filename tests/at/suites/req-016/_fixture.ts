import type { ControlledClock } from '../../harness/clock.ts';
import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
import type {
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

interface AdapterOptions {
  clock: ControlledClock;
  worlds: FixtureWorldStore;
}

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

export function createFixtureAdapter({ clock, worlds }: AdapterOptions) {
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
  const commentGuard = { cap: 2, windowMs: 60_000 };

  const emitKnown = async (
    world: NotificationFixtureWorld,
    event: string,
    params: Record<string, unknown> = {},
  ): Promise<{ eventId: string }> => {
    const row = TAXONOMY.find((candidate) => candidate.event === event);
    if (!row) throw new Error(`fixture cannot fire unregistered notification event ${JSON.stringify(event)}`);
    const eventId = `event-${state.nextId++}`;
    const channels = channelsFor(row);
    const payload = payloadFor(row, params);
    const recipients = row.recipients.map((role) => ({
      role,
      recipientId: world.actors[role],
      channels: [...channels],
    }));
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
          payload: clone(payload),
          body: bodyFor(row, payload),
        });
      }
    }
    if (row.opsItem) {
      state.opsItems.push({ id: `ops-${eventId}`, kind: row.event, linkedEventId: eventId });
    }
    state.transitions.set(event, true);
    return { eventId };
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
    drainDeliveries: async () => {
      for (const delivery of state.deliveries) delivery.state = 'sent';
      for (const event of state.events) {
        if (event.state === 'pending' || event.state === 'retrying') {
          event.state = 'sent';
          event.attempts += 1;
        }
      }
    },
  };

  return {
    sut: { notifications: sut },
    fixtures: {
      world: async (name: string) => {
        const base = await worlds.world(name);
        const burstComments = async (world: NotificationFixtureWorld, count: number) => {
          const now = clock.now();
          if (commentWindowStart === null || now - commentWindowStart >= commentGuard.windowMs) {
            commentWindowStart = now;
            commentsInWindow = 0;
          }
          for (let index = 0; index < count; index++) {
            if (commentsInWindow < commentGuard.cap) {
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
      commentWindowStart = null;
      commentsInWindow = 0;
    },
  };
}
