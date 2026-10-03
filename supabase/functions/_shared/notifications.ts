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

export type SenderDeclaration = {
  component: string;
  canSendDirectly: boolean;
};

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
  recipients: EventRecipient[];
  state: NotificationState;
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
  deliveredByProcess: string | null;
  payload: Record<string, unknown>;
  body: string;
};

export type OpsItemRow = {
  id: string;
  kind: string;
  linkedEventId: string | null;
};

export type EmitRequest = {
  event: string;
  actor: string | null;
  params: Record<string, unknown>;
};

export type EmitOutcome = { accepted: true; eventId: string } | { accepted: false; reason: string };

export type RoleHolder = {
  recipientId: string;
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

export type PendingDelivery = {
  id: string;
  eventId: string;
  recipientId: string;
  address: string | null;
  channel: Channel;
  subject: string;
  body: string;
  idempotencyKey: string;
};

export type ProviderOutcome = 'accepted' | 'rejected' | 'no_ack';

export type ProviderAnswer = {
  outcome: ProviderOutcome;
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
  append(write: WriteSet): Promise<{ eventId: string }>;
  pending(): Promise<PendingDelivery[]>;
  applyPassResults(results: PassResult[], processEpoch: string): Promise<void>;
  events(filter?: { type?: string }): Promise<NotificationEventRow[]>;
  deliveries(filter?: { type?: string }): Promise<DeliveryRow[]>;
  opsItems(filter?: { linkedEventId?: string }): Promise<OpsItemRow[]>;
};

export type ProviderPort = {
  deliver(message: OutgoingMessage): Promise<ProviderAnswer>;
};

export type DirectoryPort = {
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
  epoch(): string;
};

export type GuardConfig = {
  cap: number;
  windowMs: number;
  coalesce: boolean;
};

export type ThreadCommentGuard = {
  allow(): boolean;
};

export const TAXONOMY_PORT: TaxonomyPort = {
  rows: () => TAXONOMY,
  documentedDefaults: documentedDefaultsOf,
};

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
  runPass(): Promise<{ attempted: number }>;
  drain(opts?: { passes?: number }): Promise<void>;
  events(filter?: { type?: string }): Promise<NotificationEventRow[]>;
  deliveries(filter?: { type?: string }): Promise<DeliveryRow[]>;
  opsItems(filter?: { linkedEventId?: string }): Promise<OpsItemRow[]>;
  threadCommentGuard(config: GuardConfig): ThreadCommentGuard;
};

export function createNotifications(deps: NotificationDeps): Notifications {
  const { taxonomy, outbox, provider, directory, clock, process: proc } = deps;

  const runPassOver = async (pending: PendingDelivery[]): Promise<{ attempted: number }> => {
    const results: PassResult[] = [];
    for (const delivery of pending) {
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
