/**
 * REQ-016's notification core: one emitter and one delivery worker behind six ports.
 *
 * THE SUBSYSTEM HAS ONE IMPLEMENTATION AND TWO BINDINGS. This module decides everything and stores
 * nothing. The acceptance suite's loop fixture binds the ports to memory and to the harness's
 * provider simulator; its live adapter binds them to the local stack over SQL and SMTP. A loop
 * green and an integration green run the same emitter, the same taxonomy, the same defaults, the
 * same copy and the same worker. Only the storage, the wire and the clock differ, and each of those
 * is a port with two implementations a reviewer can read side by side.
 *
 * DECIDING IS SEPARATED FROM WRITING, and that is the price of a TypeScript core. The core cannot
 * run inside a database transaction, and the atomicity criterion demands that a producer's state
 * transition and the notification write commit or roll back as one unit. So `emit` prepares the
 * whole write set before any transaction opens, and `OutboxPort.append` hands it to one database
 * call that applies the producer's transition and the write set together. The fault point sits
 * inside that call, between the two, and the core never learns that faults exist.
 *
 * THE BRAND ON `WriteSet` IS THE TYPE HALF OF "SOLE WRITER". The symbol is declared and never
 * exported, `prepareWriteSet` is the only constructor, and `OutboxPort.append` takes nothing else.
 * A second sender would have to write a cast, which is a decision somebody takes rather than a
 * mistake they make. The privilege half and the schema half are in the migration.
 *
 * Pure: no I/O, no clock read, no randomness, no Deno, relative imports only, so `tests/at`
 * type-checks it and both bindings import it.
 */

import { renderCopy } from './notification-copy.ts';
import {
  channelsFor,
  documentedDefaults as documentedDefaultsOf,
  TAXONOMY,
  type Channel,
  type DocumentedDefault,
  type Role,
  type TaxonomyRow,
} from './notification-taxonomy.ts';

export const EMITTER_COMPONENT = 'notifications.emitter';

/* ------------------------------------------------------------------- the architecture's report */

export type SenderDeclaration = {
  /** component identifier, e.g. 'notifications.emitter' or 'blockers.service' */
  component: string;
  /** whether this component holds a direct send path or a provider credential */
  canSendDirectly: boolean;
};

/**
 * The architecture's own statement of who may send. AT-016.01 compares it with a scan of the
 * source tree; the two are never derived from one another, because then they would be one witness.
 */
export const SENDER_DECLARATIONS: readonly SenderDeclaration[] = [
  { component: EMITTER_COMPONENT, canSendDirectly: true },
  { component: 'blockers.service', canSendDirectly: false },
  { component: 'scope.service', canSendDirectly: false },
  { component: 'lifecycle.service', canSendDirectly: false },
];

export const NOTIFICATION_COMPONENTS: Readonly<Record<string, readonly string[]>> = {
  [EMITTER_COMPONENT]: [
    'supabase/functions/_shared/notification-provider.ts',
    'supabase/functions/_shared/notifications.ts',
    'supabase/functions/_shared/notification-taxonomy.ts',
    'supabase/functions/_shared/notification-copy.ts',
  ],
  'blockers.service': ['supabase/functions/_shared/blockers.ts', 'supabase/functions/blockers/'],
  'scope.service': ['supabase/functions/_shared/scope.ts', 'supabase/functions/scope/'],
  'lifecycle.service': ['supabase/functions/_shared/lifecycle.ts', 'supabase/functions/lifecycle/'],
};

/* ------------------------------------------------------------------------------- the rows */

export type NotificationState = 'pending' | 'retrying' | 'sent' | 'failed';

export type RegisteredRow = {
  event: string;
  recipients: Role[];
  channels: Channel[] | null;
  tone: 'normal' | 'low';
};

export type EventRecipient = {
  role: Role;
  recipientId: string;
  channels: Channel[];
};

export type NotificationEventRow = {
  id: string;
  type: string;
  /** resolved at creation, never at send time */
  recipients: EventRecipient[];
  state: NotificationState;
  /** worker passes that attempted this event, which is not the number of provider sends */
  attempts: number;
};

export type DeliveryRow = {
  eventId: string;
  type: string;
  role: Role;
  recipientId: string;
  channel: Channel;
  state: NotificationState;
  emittedBy: string;
  /** the identity of the process that performed the send, null until one did */
  deliveredByProcess: string | null;
  payload: Record<string, unknown>;
  body: string;
};

export type OpsItemRow = {
  id: string;
  kind: string;
  linkedEventId: string | null;
};

/* ------------------------------------------------------------------------ the write set */

export type EmitRequest = {
  event: string;
  /** the account that caused the event, or null for a system cause */
  actor: string | null;
  /** the producer's context, frozen onto the event and every delivery */
  params: Record<string, unknown>;
};

export type EmitOutcome = { accepted: true; eventId: string } | { accepted: false; reason: string };

export type RoleHolder = {
  recipientId: string;
  /** the email address the holder is reached at, null when the directory has none */
  address: string | null;
};

export type ResolvedRecipient = {
  role: Role;
  recipientId: string;
  address: string | null;
  channels: Channel[];
};

export type PreparedDelivery = {
  role: Role;
  recipientId: string;
  address: string | null;
  channel: Channel;
  emittedBy: typeof EMITTER_COMPONENT;
  payload: Record<string, unknown>;
  subject: string;
  body: string;
};

declare const WRITE_SET: unique symbol;

/** Only `prepareWriteSet` constructs one. The brand is the sole-writer type. */
export type WriteSet = {
  readonly [WRITE_SET]: true;
  event: {
    event: string;
    actor: string | null;
    payload: Record<string, unknown>;
    recipients: ResolvedRecipient[];
  };
  deliveries: PreparedDelivery[];
  opsItem: { kind: string; detail: Record<string, unknown> } | null;
};

/**
 * The one constructor of a `WriteSet`. It refuses a role the directory did not resolve and an email
 * delivery with no address, because either would be a delivery the worker can never perform.
 */
export function prepareWriteSet(row: TaxonomyRow, request: EmitRequest, holders: Partial<Record<Role, RoleHolder>>): WriteSet {
  const channels = channelsFor(row);
  const payload = { ...request.params };
  const copy = renderCopy(row, payload);
  const recipients: ResolvedRecipient[] = [];
  const deliveries: PreparedDelivery[] = [];
  for (const role of row.recipients) {
    const holder = holders[role];
    if (!holder) throw new Error(`cannot emit ${row.event}: the directory resolved nobody for the ${role} role`);
    if (channels.includes('email') && holder.address === null) {
      throw new Error(`cannot emit ${row.event}: the ${role} recipient ${holder.recipientId} has no email address and the row delivers by email`);
    }
    recipients.push({ role, recipientId: holder.recipientId, address: holder.address, channels: [...channels] });
    for (const channel of channels) {
      deliveries.push({
        role,
        recipientId: holder.recipientId,
        address: holder.address,
        channel,
        emittedBy: EMITTER_COMPONENT,
        payload: { ...payload },
        subject: copy.subject,
        body: copy.body,
      });
    }
  }
  const write = {
    event: { event: row.event, actor: request.actor, payload, recipients },
    deliveries,
    opsItem: row.opsItem ? { kind: row.event, detail: {} } : null,
  };
  return write as WriteSet;
}

/* ---------------------------------------------------------------------------- the six ports */

export type PendingDelivery = {
  id: string;
  eventId: string;
  recipientId: string;
  address: string | null;
  channel: Channel;
  subject: string;
  body: string;
  /** read off the row, never derived here, so a retry cannot derive it differently */
  idempotencyKey: string;
};

export type ProviderOutcome = 'accepted' | 'rejected' | 'no_ack';

export type ProviderAnswer = {
  /** 'accepted' only when the provider confirmed; 'no_ack' is silence and is not a refusal */
  outcome: ProviderOutcome;
  /** what the provider answered, kept as the durable receipt of an acceptance */
  receipt: Record<string, unknown> | null;
};

export type PassResult = {
  id: string;
  outcome: ProviderOutcome;
  receipt: Record<string, unknown> | null;
};

export type OutgoingMessage = {
  key: string;
  to: string;
  subject: string;
  body: string;
  eventId: string;
  recipientId: string;
  channel: Channel;
};

export type OutboxPort = {
  /** apply the producer's transition and this write set as one unit, and return the minted id */
  append(write: WriteSet): Promise<{ eventId: string }>;
  /** deliveries not yet sent, oldest first, with everything a send needs */
  pending(): Promise<PendingDelivery[]>;
  /** one worker pass applied as one unit: mark, stamp, count the attempt, derive the event state */
  applyPassResults(results: PassResult[], processEpoch: string): Promise<void>;
  events(filter?: { type?: string }): Promise<NotificationEventRow[]>;
  deliveries(filter?: { type?: string }): Promise<DeliveryRow[]>;
  opsItems(filter?: { linkedEventId?: string }): Promise<OpsItemRow[]>;
};

export type ProviderPort = {
  deliver(message: OutgoingMessage): Promise<ProviderAnswer>;
};

export type DirectoryPort = {
  /** role to account id and address, read at emit time, never at send time */
  resolve(roles: readonly Role[]): Promise<Partial<Record<Role, RoleHolder>>>;
};

export type TaxonomyPort = {
  rows(): readonly TaxonomyRow[];
  documentedDefaults(): DocumentedDefault[];
};

export type ClockPort = {
  now(): number;
};

export type ProcessPort = {
  /** the identity of the delivery process; a restart is a new identity */
  epoch(): string;
};

/* ----------------------------------------------------------- the thread-comment producer guard */

export type GuardConfig = {
  cap: number;
  windowMs: number;
  coalesce: boolean;
};

export type ThreadCommentGuard = {
  /** true when this comment should emit a notification */
  allow(): boolean;
};

/** The taxonomy port over this tree's own taxonomy, which is the only one either binding uses. */
export const TAXONOMY_PORT: TaxonomyPort = {
  rows: () => TAXONOMY,
  documentedDefaults: documentedDefaultsOf,
};

/* ------------------------------------------------------------------------------- the core */

export type NotificationDeps = {
  taxonomy: TaxonomyPort;
  outbox: OutboxPort;
  provider: ProviderPort;
  directory: DirectoryPort;
  clock: ClockPort;
  process: ProcessPort;
};

export type Notifications = {
  senders(): SenderDeclaration[];
  taxonomy(): RegisteredRow[];
  documentedDefaults(): DocumentedDefault[];
  runtimeRegistrationSurface(): string[];
  emit(request: EmitRequest): Promise<EmitOutcome>;
  /** one worker pass over everything pending; the count is the deliveries the pass attempted */
  runPass(): Promise<{ attempted: number }>;
  /** to quiescence by default; `passes` bounds it so a test can observe the state between attempts */
  drain(opts?: { passes?: number }): Promise<void>;
  events(filter?: { type?: string }): Promise<NotificationEventRow[]>;
  deliveries(filter?: { type?: string }): Promise<DeliveryRow[]>;
  opsItems(filter?: { linkedEventId?: string }): Promise<OpsItemRow[]>;
  /**
   * A property of the thread-comment producer, not of emit: `fire('thread.comment')` must still
   * deliver, while a burst of `cap + 5` must deliver `cap` (or 1 when coalescing).
   */
  threadCommentGuard(config: GuardConfig): ThreadCommentGuard;
};

export function createNotifications(deps: NotificationDeps): Notifications {
  const { taxonomy, outbox, provider, directory, clock, process: proc } = deps;

  const runPassOver = async (pending: PendingDelivery[]): Promise<{ attempted: number }> => {
    const results: PassResult[] = [];
    for (const delivery of pending) {
      // In-app never reaches the provider: there is no provider in the path of an in-app
      // notification, so the pass records the acceptance itself.
      if (delivery.channel !== 'email') {
        results.push({ id: delivery.id, outcome: 'accepted', receipt: null });
        continue;
      }
      const answer = await provider.deliver({
        key: delivery.idempotencyKey,
        to: delivery.address ?? '',
        subject: delivery.subject,
        body: delivery.body,
        eventId: delivery.eventId,
        recipientId: delivery.recipientId,
        channel: delivery.channel,
      });
      results.push({ id: delivery.id, outcome: answer.outcome, receipt: answer.receipt });
    }
    await outbox.applyPassResults(results, proc.epoch());
    return { attempted: results.length };
  };

  return {
    senders: () => SENDER_DECLARATIONS.map((declaration) => ({ ...declaration })),

    taxonomy: () =>
      taxonomy.rows().map((row) => ({
        event: row.event,
        recipients: [...row.recipients],
        channels: row.channels ? [...row.channels] : null,
        tone: row.tone,
      })),

    documentedDefaults: () => taxonomy.documentedDefaults(),

    runtimeRegistrationSurface: () => [],

    emit: async (request) => {
      const row = taxonomy.rows().find((candidate) => candidate.event === request.event);
      if (!row) return { accepted: false, reason: 'unregistered event type' };
      const holders = await directory.resolve(row.recipients);
      const write = prepareWriteSet(row, request, holders);
      const { eventId } = await outbox.append(write);
      return { accepted: true, eventId };
    },

    runPass: async () => runPassOver(await outbox.pending()),

    drain: async (opts) => {
      const limit = opts?.passes;
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
        throw new Error(
          `drainDeliveries refuses passes=${String(limit)}. A pass budget must be a whole number of worker passes, ` +
            `at least 1; anything else bounds the drain by something other than what the test asked for.`,
        );
      }
      let pass = 0;
      for (;;) {
        if (limit !== undefined && pass >= limit) return;
        const pending = await outbox.pending();
        if (pending.length === 0) return;
        pass += 1;
        await runPassOver(pending);
      }
    },

    events: (filter) => outbox.events(filter),
    deliveries: (filter) => outbox.deliveries(filter),
    opsItems: (filter) => outbox.opsItems(filter),

    threadCommentGuard: (config) => {
      let windowStart: number | null = null;
      let commentsInWindow = 0;
      let coalescedInWindow = false;
      return {
        allow: () => {
          const now = clock.now();
          if (windowStart === null || now - windowStart >= config.windowMs) {
            windowStart = now;
            commentsInWindow = 0;
            coalescedInWindow = false;
          }
          let emit = false;
          if (config.coalesce) {
            if (!coalescedInWindow) {
              emit = true;
              coalescedInWindow = true;
            }
          } else if (commentsInWindow < config.cap) {
            emit = true;
          }
          commentsInWindow += 1;
          return emit;
        },
      };
    },
  };
}
