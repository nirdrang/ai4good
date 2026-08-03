/**
 * What REQ-016 adds to the shared harness contract.
 *
 * The generic seams — tier, clock, fixture worlds, sentinels, faults, static scan, config,
 * vendor sims, the harness shape itself — now live in ONE harness-owned module,
 * `tests/at/harness/contracts.ts`. This file was the pre-harness stopgap that declared all of
 * them because no such module existed; keeping thirty suites each restating the seam is how
 * "the harness contract" stops meaning anything.
 *
 * What is left here is genuinely REQ-016's: the notification system under test, the row / event /
 * delivery shapes its assertions read, and what this requirement's fixture world can do. The
 * shared types are re-exported so the test bodies still import one file.
 *
 * Integration point: `_bind.ts` remains the ONLY module that resolves the real harness. When a
 * later slice changes a shared seam, reconcile it in the harness module, never in the tests.
 */

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

/* ------------------------------------------------------------------ SUT (REQ-016) */

/*
 * TYPE ALIASES, NOT INTERFACES, FROM HERE DOWN — the same rule `contracts.ts` states for the shared
 * seams, arriving at this file only now, and for a reason that did not exist before.
 *
 * Nothing reachable from the objects `open()` hands a test body may be an interface, because an
 * interface can be reopened with `declare module` and a member merged into it read green off a
 * value that never supplies it. An OPTIONAL member is what makes that slip past everything: the
 * producer still satisfies its annotation, so nothing goes red anywhere, and the body reads
 * `undefined` at run time believing it read data.
 *
 * These types sat OUTSIDE that boundary while `open().sut` and `open().w` were the suite's own type
 * arguments — pinning your own types hides a merged member rather than rejecting it, which is
 * exactly why "REQ-016 is not affected" was never an answer. AI4DEV-31 derives both from the
 * adapter instead, so `open().sut` now resolves to `NotificationsSut` and everything its methods
 * return is on the seam path. Being on that path is what puts them under the rule.
 *
 * The severity did drop on the way in: with one derived type, a merged-in REQUIRED member breaks
 * the adapter itself (TS2741). What the alias conversion kills is the OPTIONAL member that reads
 * `undefined` and breaks nothing — precisely the case that slipped past two adversarial gates in
 * AI4DEV-24 and is the reason this rule exists at all.
 *
 * `World` is deliberately NOT converted, and `harness/type-invention.selftest.ts` records why so a
 * later author does not "restore uniformity" without knowing: after the derivation `open().w` is
 * the adapter's concrete fixture-world CLASS, and a class does not acquire members merely because
 * an interface it implements was augmented, so the read is rejected either way. Converting it would
 * buy nothing. That is measured, not assumed — re-measure before changing it.
 */

export type SenderProbe = {
  /** component identifier, e.g. 'notifications.emitter', 'blockers.service' */
  component: string;
  /** does this component hold a direct send path / provider credential? */
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
  /** where the default is documented — empty string = implicit behaviour, which fails AT-016.06 */
  source: string;
};

export type NotificationEvent = {
  id: string;
  type: string;
  /** resolved at event CREATION (AT-016.10), never at send time */
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
  /** which component performed the send — AT-016.01's sole-writer observable */
  emittedBy: string;
  payload: Record<string, unknown>;
  /** rendered copy delivered to the recipient (payload semantics checks) */
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
};

/* ----------------------------------------------- REQ-016's fixture world + harness */

/** What REQ-016's scenarios need a world to do, on top of the shared world seam. */
export interface World extends WorldSeam {
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
}

/** The shared vendor seams, bound to the channel names REQ-016's taxonomy uses. */
export type ProviderAttempt = SharedProviderAttempt<Channel>;
export type EmailProviderSim = SharedEmailProviderSim<Channel>;
export type Vendors = SharedVendors<Channel>;

// A suite-local `AtHarness` alias and a `HarnessModule` interface used to live here, binding the
// shared harness to REQ-016's system under test, world and channel names. They went dead when the
// harness stopped being a type a suite may name or re-label: `h` is now exactly what the factory is
// checked to produce, so there is nothing for a suite to bind. Left in place they would be the most
// inviting thing in this file for a future author to reach for, and reaching for them is precisely
// the move the type-check no longer permits.
