export type { Tier } from './registry.ts';
export { TIERS } from './registry.ts';
export type { ConfigRegistry } from './config.ts';

import type { ConfigRegistry } from './config.ts';
import type { Tier } from './registry.ts';

/** The minimum every fixture world owes the harness: it can be given back. */
export type WorldSeam = {
  teardown(): Promise<void>;
};

/** A suite parameterizes this with its own world type; the seam is the same for all of them. */
export type Fixtures<W extends WorldSeam = WorldSeam> = {
  world(name: string): Promise<W>;
};

export type Clock = {
  freezeAt(iso: string): Promise<void>;
  advance(ms: number): Promise<void>;
};

export type RealClock = {
  /** the wall clock, which is the only clock a live stack shares with the test */
  now(): number;
};

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
   * MUST reject a point that is not in points().
   */
  at(point: string, kind: 'crash' | 'reject' | 'lose_ack'): Promise<FaultHandle>;
  /** kill and restart the delivery process mid-flight (AT-016.07) */
  processRestart(): Promise<void>;
  /** identity of the delivery process; MUST change across processRestart() */
  processEpoch(): Promise<string>;
};

export type StaticScan = {
  /** components whose SOURCE imports a comms-provider client or reads a provider credential */
  providerClientImporters(): Promise<string[]>;
};

export type ProviderOutcome = 'accepted' | 'rejected' | 'ack_lost';

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
  /** every send that arrived at the provider seam, accepted or not, in order; recorded by the simulator, not the SUT */
  attempts(): ProviderAttempt<Channel>[];
};

export type Vendors<Channel extends string = string> = {
  email: EmailProviderSim<Channel>;
  anthropic: AnthropicMessagesSim;
};

export type ModelUsage = {
  inputTokens: number; outputTokens: number;
  cacheCreationInputTokens?: number; cacheReadInputTokens?: number;
};
export type ModelRequestRecord = import('../../../supabase/functions/_shared/discovery-turn.ts').DiscoveryModelRequest;
export type ScriptedReply =
  | { kind: 'text'; text: string; usage: ModelUsage; inputTokens?: number; stopReason?: 'end_turn' | 'max_tokens' | 'refusal' }
  | { kind: 'tool'; name: string; input: unknown; text?: string; usage: ModelUsage; inputTokens?: number }
  | { kind: 'error'; status: number | null; reason: string; inputTokens?: number };
export type ModelAnswerRecord =
  | { ok: true; text: string; stopReason: string; usage: ModelUsage; model: string; toolUse?: { name: string; input: unknown } | null }
  | { ok: false; status: number | null; reason: string };
export type AnthropicMessagesPort = {
  model: string;
  create(request: ModelRequestRecord): Promise<ModelAnswerRecord>;
  stream(request: ModelRequestRecord, onDelta: (text: string) => void, signal: AbortSignal): Promise<ModelAnswerRecord>;
};
export type AnthropicMessagesSim = {
  script(replies: readonly ScriptedReply[]): void;
  requests(): ModelRequestRecord[];
};

export type AtHarness<Sut = Record<string, unknown>, W extends WorldSeam = WorldSeam, Channel extends string = string> = {
  tier: Tier;
  clock: Clock;
  fixtures: Fixtures<W>;
  sentinels: Sentinels;
  faults: Faults;
  static: StaticScan;
  config: ConfigRegistry;
  vendors: Vendors<Channel>;
  sut: Sut;
  teardown(): Promise<void>;
};

export type TierHarness<
  T extends Tier,
  Sut = Record<string, unknown>,
  W extends WorldSeam = WorldSeam,
  Channel extends string = string,
> = T extends 'loop'
  ? AtHarness<Sut, W, Channel>
  : Omit<AtHarness<Sut, W, Channel>, 'clock' | 'vendors'> & { clock: RealClock };
