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
 * That claim is not left to a comment to enforce. The provenance ledger marks `sut.notifications`
 * a stand-in (`standInCapability` in `harness/index.ts`), and the registry refuses ANY stubbed
 * capability above the loop tier — so this adapter cannot reach the integration-tier run that is
 * the /pm-done evidence gate. The gate can only ever be satisfied by the real implementation.
 */

import type { ControlledClock } from '../../harness/clock.ts';
import type { AdapterFaultSeam, ArmedFault, FaultKind } from '../../harness/faults.ts';
import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
import type { AdapterSentinelSeam } from '../../harness/sentinels.ts';
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

export function createFixtureAdapter({ clock, worlds, config }: AdapterOptions) {
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
    const eventId = `event-${state.nextId++}`;
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
    // ONE ROLLBACK UNIT: a crash at the point puts the transition back the way it was, so neither
    // side is committed. Restoring the PREVIOUS value rather than deleting the key matters — an
    // earlier firing of the same event legitimately left one behind, and deleting it would report
    // "the transition never happened" about a transition that did.
    const transitionBefore = state.transitions.get(event);
    state.transitions.set(event, true);
    try {
      reachFaultPoint(FAULT_POINT);
    } catch (fault) {
      if (transitionBefore === undefined) state.transitions.delete(event);
      else state.transitions.set(event, transitionBefore);
      throw fault;
    }

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
