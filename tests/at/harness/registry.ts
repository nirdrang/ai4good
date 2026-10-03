import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import type { AtHarness, TierHarness } from './contracts.ts';
import { AtPending, CapabilityPending } from './pending.ts';
import type { SuiteId, SutKeyOf, SutOf, WorldOf } from './suite-adapters.ts';

const AT_ID = /^AT-(\d{3}(?:\.\d+)*)\.(\d+[a-z]?)$/;

export interface ParsedAtId {
  atId: string;
  requirement: string;
  number: string;
}

export function parseAtId(atId: string): ParsedAtId {
  const m = AT_ID.exec(atId);
  if (!m) {
    throw new Error(
      `malformed AT id ${JSON.stringify(atId)} — expected AT-<requirement>.<number>, ` +
        `e.g. AT-016.01 or AT-005.5.03 (the last dot-segment is the test number)`,
    );
  }
  return { atId, requirement: m[1], number: m[2] };
}

/** Surface is an axis independent of tier: one authored body, driven through different drivers. */
export type Surface = 'backend' | 'ui' | 'skill';

export interface AtTestOptions {
  /** `ui` marks the test as part of a wiring leaf's `--wired` re-run selection */
  surface?: Surface;
  /** Per-tier test timeout in ms for a body that waits out real time; tiers not named keep vitest's `testTimeout`. */
  timeoutMs?: Partial<Record<Tier, number>>;
}

export function tierTimeout(timeoutMs: Partial<Record<Tier, number>> | undefined, tier: Tier | null): number | undefined {
  if (!timeoutMs || tier === null) return undefined;
  const chosen = timeoutMs[tier];
  return typeof chosen === 'number' && Number.isFinite(chosen) && chosen > 0 ? chosen : undefined;
}

/** The requirement and system-under-test key a suite is bound to; the seam types derive from them. */
export interface SuiteBinding<R extends SuiteId, K extends SutKeyOf<R>> {
  /** the requirement this suite tests, e.g. 'req-016' */
  requirement: R;
  /** which member of `harness.sut` the whole suite drives, e.g. 'notifications' */
  sut: K;
  /** the suite's own words for "the implementation has not landed yet" */
  sutMissingDetail?: string;
}

export interface Registration extends ParsedAtId {
  title: string;
  surface: Surface;
}

const registrations = new Map<string, Registration>();

export function registeredTests(): Registration[] {
  return [...registrations.values()];
}

export type Tier = 'loop' | 'integration' | 'drill';

export const TIERS: readonly Tier[] = ['loop', 'integration', 'drill'] as const;

const RAW_TIER = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.AT_TIER;

export const TIER: Tier | null = TIERS.includes(RAW_TIER as Tier) ? (RAW_TIER as Tier) : null;

const tierError = (requirement: string) =>
  `AT_TIER is ${RAW_TIER === undefined ? 'unset' : JSON.stringify(RAW_TIER)}; expected one of ${TIERS.join('|')} — run via \`bun run at:verify req-${requirement} --tier <tier>\``;

export { AtPending, CapabilityPending } from './pending.ts';
export type { PendingPhase } from './pending.ts';

export const HARNESS_MODULE = './index.ts';

export type WorldLike = {
  teardown(): Promise<void>;
};

export type ConfigOverrides = Record<string, number | boolean>;

export interface HarnessModule {
  createHarness(opts: { requirement: string; tier: Tier; configOverrides?: ConfigOverrides }): Promise<AtHarness>;
  liveAdapterExists(requirement: string): boolean;
}

let harnessModule: HarnessModule | null = null;
let harnessResolveError = '';

try {
  const mod = (await import(/* @vite-ignore */ HARNESS_MODULE)) as Partial<HarnessModule>;
  if (typeof mod.createHarness !== 'function' || typeof mod.liveAdapterExists !== 'function') {
    harnessResolveError = `resolved ${HARNESS_MODULE} but it exports no createHarness() and liveAdapterExists()`;
  } else {
    harnessModule = mod as HarnessModule;
  }
} catch (err) {
  harnessResolveError = err instanceof Error ? err.message : String(err);
}

type SeamOpenWorld<Sut = unknown, W extends WorldLike = WorldLike, T extends Tier = 'loop'> = {
  h: TierHarness<T>;
  w: W;
  sut: Sut;
};

/** What `open()` hands a test body. */
export type OpenWorld<R extends SuiteId, K extends SutKeyOf<R>, T extends Tier = 'loop'> = SeamOpenWorld<
  SutOf<R, K>,
  WorldOf<R>,
  T
>;

export interface OpenOverrides {
  /** Re-tune pinned values for this world only; a key the at-config registry lacks throws. */
  config?: ConfigOverrides;
}

type SeamContext<Sut = unknown, W extends WorldLike = WorldLike, T extends Tier = 'loop'> = {
  atId: string;
  /** build a fresh "Given" world (and its own harness). Call it more than once for isolation. */
  open(fixture?: string, opts?: OpenOverrides): Promise<SeamOpenWorld<Sut, W, T>>;
  /** consume an immutable capture whose producer proved at least one real open() */
  capture<C>(evidence: EvidenceCaptureImpl<C, Sut, W, T>): Promise<C>;
};

/** Everything a test body is given. `atId` is read-only context, never re-supplied to open(). */
export type AtContext<R extends SuiteId, K extends SutKeyOf<R>, T extends Tier = 'loop'> = SeamContext<
  SutOf<R, K>,
  WorldOf<R>,
  T
>;

const USAGE = Symbol('at-context-usage');

interface Usage {
  opens: number;
  captures: number;
}

type InternalContext<Sut, W extends WorldLike, T extends Tier = 'loop'> = SeamContext<Sut, W, T> & {
  [USAGE]: Usage;
};

function evidencePath(path: string): string {
  return path ? `the captured value at ${JSON.stringify(path)}` : 'the captured value';
}

function constructorName(value: object): string {
  return Object.getPrototypeOf(value)?.constructor?.name ?? 'an object with an exotic prototype';
}

/** Deep-freeze a capture; throws on anything `Object.freeze` leaves mutable (Map, Set, Date, class instances). */
export function freezeEvidence<T>(value: T, path = '', seen = new WeakSet<object>()): T {
  if (value === null) return value;
  const type = typeof value;
  if (type === 'undefined' || type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') return value;
  if (type === 'function') {
    throw new Error(`${evidencePath(path)} is a function — captured evidence must be inert data, not something that can still run`);
  }
  if (type === 'symbol') {
    throw new Error(`${evidencePath(path)} is a symbol — captured evidence must be inert data an assertion can read`);
  }

  const object = value as unknown as object;
  if (seen.has(object)) return value;
  seen.add(object);

  if (Array.isArray(object)) {
    for (const [index, child] of object.entries()) freezeEvidence(child, `${path}[${index}]`, seen);
    return Object.freeze(value);
  }

  const proto = Object.getPrototypeOf(object);
  if (proto !== null && proto !== Object.prototype) {
    throw new Error(
      `${evidencePath(path)} is a ${constructorName(object)} — freezeEvidence accepts only primitives, ` +
        `arrays and plain objects, because Object.freeze leaves a Map, Set, Date or class instance ` +
        `mutable through its own methods. Capture it as inert data instead.`,
    );
  }

  for (const [key, child] of Object.entries(object as Record<string, unknown>)) {
    freezeEvidence(child, path ? `${path}.${key}` : key, seen);
  }
  return Object.freeze(value);
}

export function captureProducerProblem(opensBefore: number, opensAfter: number): string | null {
  return opensAfter === opensBefore ? 'capture producer completed without open()' : null;
}

export function captureFailure(name: string, requirement: string, producerAtId: string, err: unknown): unknown {
  if (err instanceof CapabilityPending || err instanceof AtPending) return err;
  const detail = err instanceof Error ? err.message : String(err);
  return new Error(
    `evidence capture ${JSON.stringify(name)} (${requirement}) produced by ${producerAtId} failed — ${detail}`,
    { cause: err },
  );
}

class EvidenceCaptureImpl<C, Sut = unknown, W extends WorldLike = WorldLike, T extends Tier = 'loop'> {
  private result: Promise<C> | null = null;
  private producerAtId = '';

  constructor(
    readonly name: string,
    readonly requirement: string,
    private readonly producer: (ctx: SeamContext<Sut, W, T>) => Promise<C>,
  ) {}

  consume(ctx: InternalContext<Sut, W, T>): Promise<C> {
    if (!this.result) {
      this.producerAtId = ctx.atId;
      const opensBefore = ctx[USAGE].opens;
      this.result = (async () => {
        try {
          const value = await this.producer(ctx);
          const problem = captureProducerProblem(opensBefore, ctx[USAGE].opens);
          if (problem) {
            throw new Error(`evidence capture ${JSON.stringify(this.name)} produced by ${ctx.atId} — ${problem}`);
          }
          return freezeEvidence(value);
        } catch (err) {
          throw captureFailure(this.name, this.requirement, this.producerAtId, err);
        }
      })();
    }
    return this.result;
  }
}

/** An immutable capture, consumable by any test in the suite that defined it. */
export type EvidenceCapture<T, R extends SuiteId, K extends SutKeyOf<R>> = EvidenceCaptureImpl<T, SutOf<R, K>, WorldOf<R>>;

/** Define a capture produced once and consumed by many tests of the bound suite. */
type DefineEvidenceCaptureFn = <T, R extends SuiteId, K extends SutKeyOf<R>>(
  binding: SuiteBinding<R, K>,
  name: string,
  producer: (ctx: AtContext<R, K>) => Promise<T>,
) => EvidenceCapture<T, R, K>;

export const defineEvidenceCapture: DefineEvidenceCaptureFn = (binding, name, producer) =>
  new EvidenceCaptureImpl(name, binding.requirement, producer);

export function testUseProblem(opens: number, captures: number): string | null {
  return opens === 0 && captures === 0 ? 'test body never opened a fixture world or consumed trusted captured evidence' : null;
}

export async function executeRegisteredBody<Sut, W extends WorldLike>(
  atId: string,
  body: (ctx: SeamContext<Sut, W>) => Promise<void>,
  ctx: SeamContext<Sut, W>,
  usage: Usage,
): Promise<void> {
  await body(ctx);
  const problem = testUseProblem(usage.opens, usage.captures);
  if (problem) throw new Error(`${atId} INVALID — ${problem}`);
}

export interface TrackedTeardown {
  what: string;
  teardown(): Promise<void>;
}

export interface TeardownFailure {
  what: string;
  error: unknown;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function drainTeardowns(worlds: TrackedTeardown[], harnesses: TrackedTeardown[]): Promise<TeardownFailure[]> {
  const failures: TeardownFailure[] = [];
  const drain = async (stack: TrackedTeardown[]) => {
    while (stack.length) {
      const entry = stack.pop()!;
      try {
        await entry.teardown();
      } catch (err) {
        failures.push({ what: entry.what, error: err });
      }
    }
  };
  await drain(worlds);
  await drain(harnesses);
  return failures;
}

export async function runTrackedTest(
  atId: string,
  run: () => Promise<void>,
  worlds: TrackedTeardown[],
  harnesses: TrackedTeardown[],
): Promise<void> {
  let bodyFailed = false;
  let bodyError: unknown;
  try {
    await run();
  } catch (err) {
    bodyFailed = true;
    bodyError = err;
  }

  const failures = await drainTeardowns(worlds, harnesses);

  if (bodyFailed) {
    for (const failure of failures) {
      console.error(`${atId} — teardown ALSO failed (${failure.what}): ${errorText(failure.error)}`);
    }
    throw bodyError;
  }

  if (failures.length) {
    const summary = failures.map((failure) => `${failure.what}: ${errorText(failure.error)}`).join('; ');
    throw new AggregateError(
      failures.map((failure) => (failure.error instanceof Error ? failure.error : new Error(errorText(failure.error)))),
      `${atId} INVALID — the body passed but ${failures.length} teardown${failures.length === 1 ? '' : 's'} failed, ` +
        `so state this test built leaks into the next id: ${summary}`,
    );
  }
}

interface OpenOptions {
  atId: string;
  requirement: string;
  sutKey: string;
  sutMissing: string;
  fixture: string;
  configOverrides?: ConfigOverrides;
}

async function openWorld(o: OpenOptions): Promise<{ opened: SeamOpenWorld; harness: AtHarness }> {
  if (TIER === null) throw new AtPending(o.atId, 'tier-unset', tierError(o.requirement));

  if (!harnessModule) {
    throw new AtPending(
      o.atId,
      'harness-missing',
      `cannot resolve "${HARNESS_MODULE}" from tests/at/harness (${harnessResolveError}) — ` +
        `index.ts, clock.ts, fixtures.ts, sentinels.ts, faults.ts, vendors.ts exist`,
    );
  }

  const standInRefusal = aboveLoopStandInRefusal(TIER, harnessModule.liveAdapterExists(`req-${o.requirement}`), o.sutKey);
  if (standInRefusal) throw standInRefusal;

  const h = await harnessModule.createHarness({
    requirement: `req-${o.requirement}`,
    tier: TIER,
    configOverrides: o.configOverrides,
  });
  try {
    expect(h.tier, `harness built tier "${h.tier}" for a --tier ${TIER} run`).toBe(TIER);

    const sut = h.sut?.[o.sutKey];
    if (!sut) throw new AtPending(o.atId, 'sut-missing', o.sutMissing);

    const w = await h.fixtures.world(o.fixture);
    return { opened: { h, w, sut }, harness: h };
  } catch (err) {
    await h.teardown().catch(() => undefined);
    throw err;
  }
}

/** One authored test body, for the suite bound to requirement `R` and sut key `K`, at tier `T`. */
export type AtTestBody<R extends SuiteId, K extends SutKeyOf<R>, T extends Tier = 'loop'> = (
  ctx: AtContext<R, K, T>,
) => Promise<void>;

/** One body per tier; `default` covers every tier not named. */
export type AtTestBodies<R extends SuiteId, K extends SutKeyOf<R>> = {
  default?: AtTestBody<R, K, 'loop'>;
  loop?: AtTestBody<R, K, 'loop'>;
  integration?: AtTestBody<R, K, 'integration'>;
  drill?: AtTestBody<R, K, 'drill'>;
};

export function tierBodyProblem(bodies: Record<string, unknown>, atId: string): string | null {
  const named = TIERS.filter((tier) => typeof bodies[tier] === 'function');
  if (named.length === 0 && typeof bodies.default !== 'function') {
    return (
      `${atId} was registered with a per-tier body map that names no body at all — neither a tier nor a default. ` +
      `One id, one body per tier.`
    );
  }
  const uncovered = TIERS.filter((tier) => typeof bodies[tier] !== 'function');
  if (uncovered.length && typeof bodies.default !== 'function') {
    return (
      `${atId} was registered with a per-tier body map that covers ${named.join(', ')} but not ` +
      `${uncovered.join(', ')}, and supplies no default. An id with no body at a tier reports as MISSING there, ` +
      `which no declaration can describe — supply a body for every tier, or a default.`
    );
  }
  return null;
}

export function chooseTierBody<B>(bodies: Record<string, B | undefined>, tier: Tier | null): B | null {
  const named = tier === null ? undefined : bodies[tier];
  return named ?? bodies.default ?? bodies.loop ?? null;
}

export function aboveLoopStandInRefusal(tier: Tier, live: boolean, sutKey: string): CapabilityPending | null {
  if (tier === 'loop' || live) return null;
  return new CapabilityPending(['fixtures.worlds', `sut.${sutKey}`]);
}

function emitRuntimeRegistration(registration: Registration): void {
  const dir = process.env.AT_REGISTRATION_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, `registration-${process.pid}.jsonl`), `${JSON.stringify(registration)}\n`, 'utf8');
}

export function requirementMismatch(atId: string, parsedRequirement: string, bound: string): string | null {
  if (!bound) {
    return (
      `${atId} was registered with no requirement — atTest cannot check that the suite whose types ` +
      `were used is the suite whose fixture adapter will be loaded. Bind the suite with ` +
      `bindSuite({ requirement: 'req-${parsedRequirement}', sut: … }).`
    );
  }
  const fromId = `req-${parsedRequirement}`;
  if (fromId === bound) return null;
  return (
    `${atId} was registered through a suite bound to ${bound} — at run time the harness would load ` +
    `${fromId}'s fixture adapter, because the requirement comes from the AT id, while the ` +
    `type-check described ${bound}'s. One id, one suite: correct the id or correct the binding.`
  );
}

/** Register one acceptance test; the id is declared here and nowhere else. A body that asserts nothing is red, and a teardown that rejects fails the test. */
type AtTestFn = {
  <R extends SuiteId, K extends SutKeyOf<R>>(
    atId: string,
    title: string,
    opts: AtTestOptions & SuiteBinding<R, K>,
    body: AtTestBody<R, K, 'loop'> | AtTestBodies<R, K>,
  ): void;
};

export const atTest: AtTestFn = <R extends SuiteId, K extends SutKeyOf<R>>(
  atId: string,
  title: string,
  opts: AtTestOptions & SuiteBinding<R, K>,
  body: AtTestBody<R, K, 'loop'> | AtTestBodies<R, K>,
): void => {
  if (typeof body !== 'function' && (body === null || typeof body !== 'object')) {
    throw new Error(`${atId}: atTest was given no test body`);
  }

  const resolved: AtTestBody<R, K, 'loop'> = (() => {
    if (typeof body === 'function') return body;
    const problem = tierBodyProblem(body as Record<string, unknown>, atId);
    if (problem) throw new Error(problem);
    const chosen = chooseTierBody(body as Record<string, unknown>, TIER);
    return chosen as AtTestBody<R, K, 'loop'>;
  })();

  const parsed = parseAtId(atId);
  const mismatch = requirementMismatch(atId, parsed.requirement, opts.requirement);
  if (mismatch) throw new Error(mismatch);

  const previous = registrations.get(atId);
  if (previous) throw new Error(`${atId} is registered twice ("${previous.title}" and "${title}") — one id, one test`);
  const registration = { ...parsed, title, surface: opts.surface ?? 'backend' };
  registrations.set(atId, registration);
  emitRuntimeRegistration(registration);

  const sutKey = opts.sut;
  const sutMissing =
    opts.sutMissingDetail ?? `REQ-${parsed.requirement}'s implementation is not in the tree — harness.sut.${sutKey} is absent`;

  const timeout = tierTimeout(opts.timeoutMs, TIER);

  it(`${atId} — ${title}`, async () => {
    expect.hasAssertions();

    const worlds: TrackedTeardown[] = [];
    const harnesses: TrackedTeardown[] = [];
    const usage: Usage = { opens: 0, captures: 0 };
    const ctx: InternalContext<SutOf<R, K>, WorldOf<R>, 'loop'> = {
      atId,
      [USAGE]: usage,
      open: async (fixture = `req-${parsed.requirement}/base`, openOpts) => {
        const { opened, harness } = await openWorld({
          atId,
          requirement: parsed.requirement,
          sutKey,
          sutMissing,
          fixture,
          configOverrides: openOpts?.config,
        });
        harnesses.push({ what: `harness for fixture world ${JSON.stringify(fixture)}`, teardown: () => harness.teardown() });
        worlds.push({ what: `fixture world ${JSON.stringify(fixture)}`, teardown: () => opened.w.teardown() });
        usage.opens += 1;
        return opened as OpenWorld<R, K, 'loop'>;
      },
      capture: async (evidence) => {
        const value = await evidence.consume(ctx);
        usage.captures += 1;
        return value;
      },
    };

    await runTrackedTest(atId, () => executeRegisteredBody(atId, resolved, ctx, usage), worlds, harnesses);
  }, timeout);
};

/** `atTest`, with the binding already applied — so bodies say `atTest(id, title, body)`. */
type BoundAtTest<R extends SuiteId, K extends SutKeyOf<R>> = {
  (atId: string, title: string, opts: AtTestOptions, body: AtTestBody<R, K, 'loop'> | AtTestBodies<R, K>): void;
  (atId: string, title: string, body: AtTestBody<R, K, 'loop'> | AtTestBodies<R, K>): void;
};

/** `defineEvidenceCapture`, with the binding already applied. */
type BoundDefineEvidenceCapture<R extends SuiteId, K extends SutKeyOf<R>> = <T>(
  name: string,
  producer: (ctx: AtContext<R, K>) => Promise<T>,
) => EvidenceCapture<T, R, K>;

/** A suite's one line of harness contact: returns `atTest` and `defineEvidenceCapture` with the seam types derived from the bound suite. */
type BindSuiteFn = <R extends SuiteId, K extends SutKeyOf<R>>(
  binding: SuiteBinding<R, K>,
) => {
  atTest: BoundAtTest<R, K>;
  defineEvidenceCapture: BoundDefineEvidenceCapture<R, K>;
};

export const bindSuite: BindSuiteFn = <R extends SuiteId, K extends SutKeyOf<R>>(binding: SuiteBinding<R, K>) => {
  const boundAtTest = (
    atId: string,
    title: string,
    optsOrBody: AtTestOptions | AtTestBody<R, K, 'loop'> | AtTestBodies<R, K>,
    maybeBody?: AtTestBody<R, K, 'loop'> | AtTestBodies<R, K>,
  ): void => {
    const looksLikeBodies =
      typeof optsOrBody === 'object' &&
      optsOrBody !== null &&
      (['default', ...TIERS] as const).some((key) => typeof (optsOrBody as Record<string, unknown>)[key] === 'function');
    const givenBody = typeof optsOrBody === 'function' || looksLikeBodies;
    const opts: AtTestOptions = givenBody ? {} : (optsOrBody as AtTestOptions);
    const body = (givenBody ? optsOrBody : maybeBody) as AtTestBody<R, K, 'loop'> | AtTestBodies<R, K>;
    atTest<R, K>(atId, title, { ...opts, ...binding }, body);
  };

  const boundCapture: BoundDefineEvidenceCapture<R, K> = (name, producer) =>
    defineEvidenceCapture(binding, name, producer);

  return {
    atTest: boundAtTest,
    defineEvidenceCapture: boundCapture,
  };
};
