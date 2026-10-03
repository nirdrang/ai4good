import type {
  EmailProviderSim as SharedEmailProviderSim,
  ProviderAttempt as SharedProviderAttempt,
  Vendors as SharedVendors,
  WorldSeam,
} from '../../harness/contracts.ts';
import type { Channel, Role } from './taxonomy.ts';

export type {
  Clock,
  ConfigRegistry,
  FaultHandle,
  Faults,
  Fixtures,
  ProviderOutcome,
  Sentinel,
  Sentinels,
  StaticScan,
  Tier,
  WorldSeam,
} from '../../harness/contracts.ts';
export { TIERS } from '../../harness/contracts.ts';

export type SenderProbe = {
  component: string;
  canSendDirectly: boolean;
};

export type RegisteredRow = {
  event: string;
  recipients: Role[];
  channels: Channel[] | null;
  tone: 'normal' | 'low';
};

export type DocumentedDefault = {
  event: string;
  channels: Channel[];
  source: string;
};

export type NotificationEvent = {
  id: string;
  type: string;
  recipients: { role: Role; recipientId: string; channels: Channel[] }[];
  state: 'pending' | 'retrying' | 'sent' | 'failed';
  attempts: number;
};

export type Delivery = {
  eventId: string;
  type: string;
  role: Role;
  recipientId: string;
  channel: Channel;
  state: 'pending' | 'retrying' | 'sent' | 'failed';
  emittedBy: string;
  deliveredByProcess: string | null;
  payload: Record<string, unknown>;
  body: string;
};

export type OpsItem = {
  id: string;
  kind: string;
  linkedEventId: string | null;
};

export type EmitResult = {
  accepted: boolean;
  reason?: string;
  eventId?: string;
};

export type NotificationsSut = {
  senders(): Promise<SenderProbe[]>;
  taxonomy(): Promise<RegisteredRow[]>;
  documentedDefaults(): Promise<DocumentedDefault[]>;
  runtimeRegistrationSurface(): Promise<string[]>;
  emit(req: { type: string; ctx?: Record<string, unknown> }): Promise<EmitResult>;
  events(filter?: { type?: string }): Promise<NotificationEvent[]>;
  deliveries(filter?: { type?: string }): Promise<Delivery[]>;
  opsItems(filter?: { linkedEventId?: string }): Promise<OpsItem[]>;
  drainDeliveries(opts?: { passes?: number }): Promise<void>;
};

export type World = WorldSeam & {
  actors: Record<Role, string>;
  addresses: Record<Role, string>;
  fire(event: string, params?: Record<string, unknown>): Promise<{ eventId: string }>;
  transitionCommitted(event: string): Promise<boolean>;
  reassignRole(role: Role, toActorId: string): Promise<string>;
  burstThreadComments(count: number): Promise<void>;
};

export type ProviderAttempt = SharedProviderAttempt<Channel>;
export type EmailProviderSim = SharedEmailProviderSim<Channel>;
export type Vendors = SharedVendors<Channel>;
