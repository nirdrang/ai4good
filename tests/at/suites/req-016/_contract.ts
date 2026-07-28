/**
 * The harness + system-under-test surface the REQ-016 suite consumes.
 *
 * WHY THIS FILE EXISTS: AI4DEV-3's capability modules (H1 runner/tiers/reporting,
 * H2 fixtures/clock, H3 sentinels/faults, H5 vendor sims, H6 at-config registry) are not
 * in the tree yet, and this suite was handed no capability contract. So the proving ground
 * states, in one type-only file, EXACTLY what it needs from the harness and from REQ-016's
 * implementation. Nothing here is implemented by the suite — it is the seam.
 *
 * SCOPE: this is what REQ-016's twelve P0 need, not the full AI4DEV-3 capability contract.
 * Semantic oracles (H4), the non-email vendor sims (H5 Anthropic/Stripe/GitHub/Lovable/Linear)
 * and the registry's schema (H6) belong to the harness item and are deliberately absent here.
 *
 * Integration point: `_bind.ts` is the ONLY module that resolves the real harness. When
 * H1-H6 land with a different surface, reconcile there (and here), never in the tests.
 */

import type { Channel, Role } from './taxonomy.ts';

export type Tier = 'loop' | 'integration' | 'drill';

export const TIERS: readonly Tier[] = ['loop', 'integration', 'drill'] as const;

/* ------------------------------------------------------------------ SUT (REQ-016) */

export interface SenderProbe {
  /** component identifier, e.g. 'notifications.emitter', 'blockers.service' */
  component: string;
  /** does this component hold a direct send path / provider credential? */
  canSendDirectly: boolean;
}

export interface RegisteredRow {
  event: string;
  recipients: Role[];
  channels: Channel[] | null;
  tone: 'normal' | 'low';
}

export interface DocumentedDefault {
  event: string;
  channels: Channel[];
  /** where the default is documented — empty string = implicit behaviour, which fails AT-016.06 */
  source: string;
}

export interface NotificationEvent {
  id: string;
  type: string;
  /** resolved at event CREATION (AT-016.10), never at send time */
  recipients: { role: Role; recipientId: string; channels: Channel[] }[];
  state: 'pending' | 'retrying' | 'sent' | 'failed';
  attempts: number;
}

export interface Delivery {
  eventId: string;
  type: string;
  role: Role;
  recipientId: string;
  channel: Channel;
  state: 'pending' | 'retrying' | 'sent' | 'failed';
  /** which component performed the send — AT-016.01's sole-writer observable */
  emittedBy: string;
  payload: Record<string, unknown>;
  /** rendered copy delivered to the recipient (payload semantics checks) */
  body: string;
}

export interface OpsItem {
  id: string;
  kind: string;
  linkedEventId: string | null;
}

export interface EmitResult {
  accepted: boolean;
  reason?: string;
  eventId?: string;
}

export interface NotificationsSut {
  /** every component the architecture lets send comms (AT-016.01) */
  senders(): Promise<SenderProbe[]>;
  /** the registered event set (AT-016.02/03/06) */
  taxonomy(): Promise<RegisteredRow[]>;
  /** documented per-event delivery defaults; the runtime-binding oracle (AT-016.06/03) */
  documentedDefaults(): Promise<DocumentedDefault[]>;
  /** runtime registration/mutation entry points — MUST be empty in v1 (AT-016.02) */
  runtimeRegistrationSurface(): Promise<string[]>;
  /** direct emitter call, used only to probe rejection of unregistered types (AT-016.02) */
  emit(req: { type: string; ctx?: Record<string, unknown> }): Promise<EmitResult>;
  events(filter?: { type?: string }): Promise<NotificationEvent[]>;
  deliveries(filter?: { type?: string }): Promise<Delivery[]>;
  opsItems(filter?: { linkedEventId?: string }): Promise<OpsItem[]>;
  /**
   * Run the delivery worker. Default = to quiescence (or until it can make no further
   * progress). `passes` bounds it to N worker passes so a test can observe the state
   * BETWEEN attempts — AT-016.11's "the unconfirmed send is observable as pending/retrying"
   * is unobservable if every drain is run-to-quiescence.
   */
  drainDeliveries(opts?: { passes?: number }): Promise<void>;
}

/* ------------------------------------------------------- H2 fixtures + clock */

export interface World {
  /** role -> actor id in this world */
  actors: Record<Role, string>;
  /**
   * Raise a taxonomy event from its OWNING domain fixture (per the REQ-016 boundary note:
   * the events fire from their own requirements; this suite asserts who/how).
   */
  fire(event: string, params?: Record<string, unknown>): Promise<{ eventId: string }>;
  /** did the ledger/state transition that accompanies this event commit? (AT-016.09) */
  transitionCommitted(event: string): Promise<boolean>;
  /** hand a role to a different actor (AT-016.10) */
  reassignRole(role: Role, toActorId: string): Promise<string>;
  /** post N thread comments inside one anti-spam window (AT-016.08) */
  burstThreadComments(count: number): Promise<void>;
  teardown(): Promise<void>;
}

export interface Fixtures {
  world(name: string): Promise<World>;
}

export interface Clock {
  freezeAt(iso: string): Promise<void>;
  advance(ms: number): Promise<void>;
  /**
   * The current time AS THE PRODUCT READS IT, sampled inside the product process.
   * Without this a "controlled clock" that only moves the test's own notion of time
   * cannot be distinguished from one that is actually wired into the code under test.
   */
  observedByProduct(): Promise<string>;
}

/* -------------------------------------------------- H3 sentinels + faults + static scan */

export interface Sentinel {
  id: string;
  value: string;
}

export interface Sentinels {
  plant(kind: string, value: string): Promise<Sentinel>;
  /** scan a named store/scope for planted sentinels (presence AND absence) */
  scan(scope: string): Promise<Sentinel[]>;
}

export interface FaultHandle {
  /** the point this handle is armed at — echoed back so a silent re-point is visible */
  point: string;
  /** how many times execution actually REACHED the armed point (0 = the fault never fired) */
  triggerCount(): Promise<number>;
  clear(): Promise<void>;
}

export interface Faults {
  /** the fault points the product actually exposes — arming an unknown point must not be a no-op */
  points(): Promise<string[]>;
  /**
   * Induce a fault at a named point in the product.
   * 'notifications.between_transition_and_event_write' is AT-016.09's point.
   * MUST reject a point that is not in points().
   */
  at(point: string, kind: 'crash' | 'reject' | 'lose_ack'): Promise<FaultHandle>;
  /** kill and restart the delivery process mid-flight (AT-016.07) */
  processRestart(): Promise<void>;
  /** identity of the delivery process; MUST change across processRestart() */
  processEpoch(): Promise<string>;
}

/**
 * Out-of-band evidence: static facts about the product source, not self-report from the SUT.
 * AT-016.01's sole-writer claim is unfalsifiable if the only witnesses are `senders()` and
 * `Delivery.emittedBy` — both produced by the component under test.
 */
export interface StaticScan {
  /** components whose SOURCE imports a comms-provider client or reads a provider credential */
  providerClientImporters(): Promise<string[]>;
}

/* ------------------------------------------------ H6 at-config registry */

export interface ConfigRegistry {
  get<T>(key: string): T;
}

/* --------------------------------------------------- H5 vendor sims */

export type ProviderOutcome = 'accepted' | 'rejected' | 'ack_lost';

export interface ProviderAttempt {
  recipientId: string;
  eventId: string;
  channel: Channel;
  outcome: ProviderOutcome;
}

export interface EmailProviderSim {
  /** next N sends are rejected / never accepted (AT-016.11) */
  rejectNext(count: number): void;
  /** next N sends are ACCEPTED by the provider but the ack is lost (AT-016.11) */
  acceptButLoseAck(count: number): void;
  /** everything the provider actually accepted, in order */
  accepted(): ProviderAttempt[];
  /**
   * EVERY send that arrived at the provider seam, accepted or not, in order.
   * This is the out-of-band trace: it is recorded by the simulator, not by the SUT, so it
   * can contradict the SUT's own attempt counter (AT-016.11's retry proof, AT-016.01's
   * "no path around the emitter").
   */
  attempts(): ProviderAttempt[];
}

export interface Vendors {
  email: EmailProviderSim;
}

/* ------------------------------------------------------- the harness */

export interface AtHarness {
  tier: Tier;
  /**
   * Capability names this harness STUBBED for the running tier (e.g. 'vendors.email',
   * 'sut.notifications'). MUST be empty above `loop` — otherwise an integration-tier run,
   * which is the /pm-done gate, can silently stub the thing it is gating.
   */
  stubbedCapabilities(): Promise<string[]>;
  clock: Clock;
  fixtures: Fixtures;
  sentinels: Sentinels;
  faults: Faults;
  static: StaticScan;
  config: ConfigRegistry;
  vendors: Vendors;
  sut: { notifications?: NotificationsSut };
  /** REQUIRED, not optional: frozen clocks, vendor counters and fault state leak without it */
  teardown(): Promise<void>;
}

export interface HarnessModule {
  createHarness(opts: { requirement: string; tier: Tier }): Promise<AtHarness>;
}
