/**
 * The SHARED capability contract — one definition of every seam a suite is allowed to reach.
 *
 * Rule 5 of the suite-authoring rules (`loop/bringup/AI4DEV-3-at-harness.md`): tier, clock,
 * fixture, sentinel, fault, config and vendor contracts come from ONE harness package, and a
 * suite defines locally only its own system-under-test and fixture adapter. REQ-016's
 * `_contract.ts` was the pre-harness stopgap — it declared the whole surface because no harness
 * package existed to declare it — and thirty suites each restating the seam would drift into
 * thirty subtly different seams, at which point "the harness contract" means nothing.
 *
 * These are types only. The implementations arrive per slice (H2 clock/fixtures, H3
 * sentinels/faults), and `pendingCapability()` in `index.ts` is what stands where one
 * has not landed — a seam that throws the capability's name, never a no-op. Of the vendor sims, the
 * EMAIL provider landed with AI4DEV-21 (`harness/vendors.ts`); the Anthropic usage/cost, Stripe,
 * GitHub, Lovable and Linear stand-ins are each built with the FIRST test suite that consumes them
 * (founder ruling, 2026-08-04), tracked as board items AI4DEV-38 through AI4DEV-42 under the
 * AT-harness parent — their contracts land in this file when they do.
 *
 * Requirement-SPECIFIC types stay in the suite: which system under test it drives, what its
 * fixture world can do. The generics below are the joints those bolt onto.
 */

export type { Tier } from './registry.ts';
export { TIERS } from './registry.ts';
export type { ConfigRegistry } from './config.ts';
export type { LiveEmail, LiveEmailMessage, LiveVendors } from './live-email.ts';

import type { ConfigRegistry } from './config.ts';
import type { LiveVendors } from './live-email.ts';
import type { Tier } from './registry.ts';

/* ---------------------------------------------------------------- H2 fixtures + clock */

/** The minimum every fixture world owes the harness: it can be given back. */
export type WorldSeam = {
  teardown(): Promise<void>;
};

/** A suite parameterizes this with its own world type; the seam is the same for all of them. */
export type Fixtures<W extends WorldSeam = WorldSeam> = {
  world(name: string): Promise<W>;
};

/**
 * Time, under the test's control — funding's 7-day expiry, the UTC daily credit reset, blocker
 * aging, abandonment, link expiry.
 *
 * There is deliberately NO `observedByProduct()` here. A method by which the clock reports its
 * own time cannot distinguish a clock the product reads from one that only moves the test's
 * notion of time — it is the clock answering a question about itself. That wiring is proven
 * BEHAVIOURALLY instead: move the clock, then assert product behaviour that depends on time
 * changed (the anti-spam window in AT-016.08). Sampling the clock from inside the product process
 * is a real capability, but it needs a product process to sample, so it belongs to a later
 * integration-tier slice, not to a self-report.
 */
export type Clock = {
  freezeAt(iso: string): Promise<void>;
  advance(ms: number): Promise<void>;
};

/**
 * TIME AT THE INTEGRATION TIER, and the seam is gone rather than disabled.
 *
 * Above the loop tier the harness runs against a real database whose sessions really expire, so
 * there is nothing for a control seam to command: a clock that could jump forward would not move
 * GoTrue's notion of `now` by one millisecond, and a body that called it would be asserting against
 * a fiction while believing it had aged a real session.
 *
 * SO THE METHODS ARE ABSENT FROM THE TYPE, not present and throwing. `registry.ts` hands an
 * integration body a context whose `h.clock` is this type, so `await h.clock.advance(ms)` in
 * an integration body is a COMPILE error naming the method — which is the difference between a
 * mistake a reviewer has to notice and one the type-checker refuses.
 */
export type RealClock = {
  /** the wall clock, which is the only clock a live stack shares with the test */
  now(): number;
};

/* ------------------------------------------------- H3 sentinels + faults + static scan */

export type Sentinel = {
  id: string;
  value: string;
};

export type Sentinels = {
  plant(kind: string, value: string): Promise<Sentinel>;
  /** scan a named store/scope for planted sentinels (presence AND absence) */
  scan(scope: string): Promise<Sentinel[]>;
};

export type FaultHandle = {
  /** the point this handle is armed at — echoed back so a silent re-point is visible */
  point: string;
  /** how many times execution actually REACHED the armed point (0 = the fault never fired) */
  triggerCount(): Promise<number>;
  clear(): Promise<void>;
};

export type Faults = {
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
};

/**
 * Out-of-band evidence: static facts about the product source, not self-report from the SUT.
 * AT-016.01's sole-writer claim is unfalsifiable if the only witnesses are `senders()` and
 * `Delivery.emittedBy` — both produced by the component under test.
 */
export type StaticScan = {
  /** components whose SOURCE imports a comms-provider client or reads a provider credential */
  providerClientImporters(): Promise<string[]>;
};

/* ------------------------------------------------------------------- H5 vendor sims */

export type ProviderOutcome = 'accepted' | 'rejected' | 'ack_lost';

/**
 * Channels are named by the requirement that owns them (REQ-016's are 'email' and 'inapp'), so
 * the vendor types are generic over the channel name rather than hard-coding one suite's set.
 */
export type ProviderAttempt<Channel extends string = string> = {
  recipientId: string;
  eventId: string;
  channel: Channel;
  outcome: ProviderOutcome;
};

export type EmailProviderSim<Channel extends string = string> = {
  /** next N sends are rejected / never accepted (AT-016.11) */
  rejectNext(count: number): void;
  /** next N sends are ACCEPTED by the provider but the ack is lost (AT-016.11) */
  acceptButLoseAck(count: number): void;
  /** everything the provider actually accepted, in order */
  accepted(): ProviderAttempt<Channel>[];
  /**
   * EVERY send that arrived at the provider seam, accepted or not, in order.
   * This is the out-of-band trace: it is recorded by the simulator, not by the SUT, so it
   * can contradict the SUT's own attempt counter (AT-016.11's retry proof, AT-016.01's
   * "no path around the emitter").
   */
  attempts(): ProviderAttempt<Channel>[];
};

export type Vendors<Channel extends string = string> = {
  email: EmailProviderSim<Channel>;
};

/* ----------------------------------------------------------------------- the harness */

/**
 * What `createHarness()` hands a suite. A suite names its own system-under-test map and world
 * type; everything else is the same for all thirty of them.
 *
 * A TYPE ALIAS, NOT AN INTERFACE, and that is load-bearing. An interface is open to declaration
 * merging, so a suite could write `declare module './contracts.ts' { interface AtHarness { auditLog?: string[] } }`
 * and then read `h.auditLog` with a green type-check, against a harness that supplies no such thing.
 * The member being OPTIONAL is what makes it slip through: `createHarness()` still satisfies its
 * annotation, so nothing anywhere goes red. That is the same lie a free harness type parameter used
 * to permit, arriving by a different door and needing no `any` and no suppression. A type alias
 * cannot be merged into, so this door is shut, and `tests/at/typeprobes/` keeps the attack on file
 * as an executable negative test.
 *
 * EVERY CAPABILITY CONTRACT IN THIS FILE IS AN ALIAS FOR THE SAME REASON. Closing only the type
 * below left the identical attack open one level down, and worse there: `sentinels`, `faults`,
 * `static` and `vendors` come from `pendingCapability<T>()`, which casts a Proxy `as T`, so a
 * merged-in member did not break `index.ts` even when it was REQUIRED — where the same member added
 * to this type fails with TS2741. `ConfigRegistry` in `config.ts` is an alias for the same reason.
 *
 * So the rule is: contracts are type aliases, never interfaces. It covers everything reachable from
 * the harness object AND the objects `open()` hands a test body — `OpenWorld`, `AtContext` and
 * `WorldLike` in `registry.ts` obey it for the same reason these do. `WorldLike` was briefly
 * excluded as belonging to AI4DEV-31's seam; that conflated two different defects. The suite's `W`
 * being an unverified claim was AI4DEV-31's, and that item derived the seam types from the fixture
 * adapter that produces them, leaving a suite no type argument to name either one with — though a
 * widened context can still be REBUILT by hand out of the derived types, which is measured and
 * documented on `SeamOpenWorld` in `registry.ts`. The interface being augmentable is this defect,
 * not that one — and `w` is handed to the body exactly as `h` is.
 *
 * `tests/at/typeprobes/` carries an attack for every protected type, and
 * `type-invention.selftest.ts` fails by name if any of them becomes an interface again.
 */
export type AtHarness<Sut = Record<string, unknown>, W extends WorldSeam = WorldSeam, Channel extends string = string> = {
  tier: Tier;
  /**
   * Capability names this harness STUBBED for the running tier (e.g. 'vendors.email',
   * 'sut.notifications'). MUST be empty above `loop` — otherwise an integration-tier run,
   * which is the /pm-done gate, can silently stub the thing it is gating.
   *
   * Each name on this list was put there by `capabilities.ts` from one of TWO sources: a witness
   * that read the value's own control seam, or the module URL the fixture adapter was loaded from.
   * No caller names a provenance.
   *
   * WHAT EMPTYING IT COSTS DIFFERS BY NAME, and one sentence for all four would overclaim. For
   * `clock.controlled` and `vendors.email` the verdict is read off the very seam the suites drive,
   * so removing either name means removing that seam — and the behaviour tests that command the
   * clock forward and force a send to fail go red with it. For `fixtures.worlds` and every
   * `sut.<key>` there is no such seam: the verdict comes from the adapter-derived route, so
   * emptying the list there is a source edit in `capabilities.ts` — visible in a diff and pinned
   * by the conformance wall, but a word-edit all the same.
   */
  stubbedCapabilities(): Promise<string[]>;
  clock: Clock;
  fixtures: Fixtures<W>;
  sentinels: Sentinels;
  faults: Faults;
  static: StaticScan;
  config: ConfigRegistry;
  vendors: Vendors<Channel>;
  sut: Sut;
  /** REQUIRED, not optional: frozen clocks, vendor counters and fault state leak without it */
  teardown(): Promise<void>;
};

/**
 * THE SAME HARNESS, SEEN AT ONE TIER — two members differ and the rest is identical.
 *
 * `clock` and `vendors` are the two capabilities whose provenance is read off the very seam a suite
 * drives (`AtHarness.stubbedCapabilities` says so above). At the loop tier both are stand-ins with
 * control seams, which is what the loop bodies command. Above it the harness constructs the real
 * article — the passage of time, and the slot's own mail catcher — and NEITHER has a control seam,
 * because a capability that can be commanded is a substitute by definition.
 *
 * WHY IT IS A TYPE AND NOT A RUNTIME CHECK. A per-tier body written against the wrong tier's
 * capabilities is an honest mistake that would otherwise surface as a run-time `TypeError` inside a
 * test whose red is then undeclarable. Here it is a compile error at the body.
 *
 * NOTHING ELSE FORKS. `sut`, `fixtures`, `sentinels`, `faults`, `static` and `config` are
 * the same type at every tier: what changes at integration is what BACKS them, which is the ledger's
 * business and not the body's.
 */
export type TierHarness<
  T extends Tier,
  Sut = Record<string, unknown>,
  W extends WorldSeam = WorldSeam,
  Channel extends string = string,
> = T extends 'loop'
  ? AtHarness<Sut, W, Channel>
  : Omit<AtHarness<Sut, W, Channel>, 'clock' | 'vendors'> & { clock: RealClock; vendors: LiveVendors };
