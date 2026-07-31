/**
 * The AT registry — the ONE place an acceptance-test id becomes an executable test.
 *
 * It owns three things every suite would otherwise re-invent:
 *   - the AT id grammar (a malformed id throws where it is written, not three runs later),
 *   - the tier contract (`AT_TIER` comes from the runner; there is NO default),
 *   - the harness handshake: resolve the harness, build a world, tear both down per test.
 *
 * Two failure modes are kept strictly apart so a red is never ambiguous:
 *   - `harness-missing` — AI4DEV-3's capability modules (H2-H6) are not in the tree.
 *   - `sut-missing`     — the harness is up, but the requirement's implementation is not.
 * Neither can produce a green. There is no skip, no `todo`, no swallowed assertion — a pending
 * id fails loudly, stamped with its own AT id and the reason.
 *
 * ID BINDING: an id is supplied ONCE, at the `atTest` call site. The title, the failure stamp
 * and the per-id report all derive from it. The bijection checker reads those call sites.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import type { AtHarness } from './contracts.ts';

/* ------------------------------------------------------------------------ the AT id grammar */

/**
 * `AT-<requirement>.<number>` — the FINAL dot-segment is the test number and everything
 * between `AT-` and it is the requirement id, because requirement ids may themselves carry a
 * dot suffix (`005.5` is a real requirement, so `AT-005.5.03` is a real id).
 */
const AT_ID = /^AT-(\d{3}(?:\.\d+)*)\.(\d+[a-z]?)$/;

export interface ParsedAtId {
  atId: string;
  /** e.g. '016', '005.5' */
  requirement: string;
  /** e.g. '01', '05a' */
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

/* ---------------------------------------------------------------------------- registrations */

/** Surface is an axis independent of tier: one authored body, driven through different drivers. */
export type Surface = 'backend' | 'ui' | 'skill';

export interface AtTestOptions {
  /** `ui` marks the test as part of a wiring leaf's `--wired` re-run selection */
  surface?: Surface;
  /** which member of `harness.sut` this test drives (usually supplied once by `bindSuite`) */
  sut?: string;
  /** the suite's own words for "the implementation has not landed yet" */
  sutMissingDetail?: string;
}

export interface Registration extends ParsedAtId {
  title: string;
  surface: Surface;
}

const registrations = new Map<string, Registration>();

/** Everything registered in the modules loaded so far. `--wired` selects the ui-marked ids. */
export function registeredTests(): Registration[] {
  return [...registrations.values()];
}

/* ------------------------------------------------------------------------------------ tiers */

export type Tier = 'loop' | 'integration' | 'drill';

export const TIERS: readonly Tier[] = ['loop', 'integration', 'drill'] as const;

const RAW_TIER = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.AT_TIER;

/**
 * The runner (`bun run at:verify req-0NN --tier <tier>`) passes the tier through this env var.
 * There is NO default: an unset or misspelled AT_TIER on an intended integration run must
 * not silently degrade to the stubbed `loop` world — that is the /pm-done gate quietly
 * grading itself on an easier exam.
 */
export const TIER: Tier | null = TIERS.includes(RAW_TIER as Tier) ? (RAW_TIER as Tier) : null;

const tierError = (requirement: string) =>
  `AT_TIER is ${RAW_TIER === undefined ? 'unset' : JSON.stringify(RAW_TIER)}; expected one of ${TIERS.join('|')} — run via \`bun run at:verify req-${requirement} --tier <tier>\``;

/* -------------------------------------------------------------------------- the harness seam */

/** Canonical harness barrel produced by AI4DEV-3 H2-H6, resolved relative to THIS file. */
export const HARNESS_MODULE = './index.ts';

/**
 * The minimum a fixture world owes the harness.
 *
 * A TYPE ALIAS, like every other contract a test body can read from. `open()` hands `w` to the body,
 * so while this was an interface a suite could merge a member into it and read that member green off
 * an object that never supplies it — the same defect closed fifteen times elsewhere in this seam,
 * left open here by an exclusion that contradicted its own criterion.
 *
 * The exploit needed `W` at its DEFAULT, which is what made it easy to miss: a suite that pins its
 * own world type (as REQ-016 does) resolves `w` to that type and never sees the merged member. Any
 * suite that does not pin one — and `atTest` is exported with `W = WorldLike` defaulted — did.
 *
 * That the suite's chosen `W` is itself an unverified claim is a separate defect and remains
 * AI4DEV-31's. This is only about whether the door is open at all.
 */
export type WorldLike = {
  teardown(): Promise<void>;
};

/** Re-tuned pinned values for ONE world. Keys are the at-config registry's dotted keys. */
export type ConfigOverrides = Record<string, number | boolean>;

export interface HarnessModule {
  createHarness(opts: { requirement: string; tier: Tier; configOverrides?: ConfigOverrides }): Promise<AtHarness>;
}

let harnessModule: HarnessModule | null = null;
let harnessResolveError = '';

try {
  const mod = (await import(/* @vite-ignore */ HARNESS_MODULE)) as Partial<HarnessModule>;
  if (typeof mod.createHarness !== 'function') {
    harnessResolveError = `resolved ${HARNESS_MODULE} but it exports no createHarness()`;
  } else {
    harnessModule = mod as HarnessModule;
  }
} catch (err) {
  harnessResolveError = err instanceof Error ? err.message : String(err);
}

/* ---------------------------------------------------------------------------- pending errors */

export type PendingPhase = 'harness-missing' | 'sut-missing' | 'tier-unset';

export class AtPending extends Error {
  constructor(
    readonly atId: string,
    readonly phase: PendingPhase,
    detail: string,
  ) {
    super(`${atId} PENDING [${phase}] — ${detail}`);
    this.name = 'AtPending';
  }
}

/* --------------------------------------------------------------------------- the test context */

export type OpenWorld<Sut = unknown, W extends WorldLike = WorldLike> = {
  /**
   * The harness, at EXACTLY the type `createHarness()` is statically checked to produce — not a
   * suite-chosen type, and not the suite's type arguments pushed back into it.
   *
   * Two doors are shut here, and both were opened by earlier drafts of this file. A free type
   * parameter (`H extends HarnessLike`) let a suite declare seams the factory never supplies, since
   * an intersection is a subtype and satisfies the constraint. Re-labelling the produced harness
   * with the suite's own world and channel types was the same defect wearing a smaller hat: the
   * factory proves `AtHarness<…, WorldSeam, string>`, so a suite binding channel `'sms'` would have
   * been told `vendors.email.attempts()` yields `'sms'` on the strength of nothing at all.
   *
   * `w` and `sut` below are still the suite's own claims, asserted rather than verified. That is the
   * pre-existing seam AI4DEV-31 owns; it is named here so nobody mistakes this field's honesty for
   * the whole object's.
   */
  h: AtHarness;
  w: W;
  /** the requirement's system under test, guaranteed non-null once open() returns */
  sut: Sut;
};

export interface OpenOverrides {
  /**
   * Re-tune pinned values for THIS world only, so one authored body can be run against two
   * materially different configurations. A key the at-config registry does not already carry
   * throws: an override may re-tune a knob that exists, never invent one the product has not
   * got.
   */
  config?: ConfigOverrides;
}

/** Everything a test body is given. `atId` is read-only context, never re-supplied to open(). */
export type AtContext<Sut = unknown, W extends WorldLike = WorldLike> = {
  atId: string;
  /** build a fresh "Given" world (and its own harness). Call it more than once for isolation. */
  open(fixture?: string, opts?: OpenOverrides): Promise<OpenWorld<Sut, W>>;
  /** consume an immutable capture whose producer proved at least one real open() */
  capture<T>(evidence: EvidenceCapture<T, Sut, W>): Promise<T>;
};

const USAGE = Symbol('at-context-usage');

interface Usage {
  opens: number;
  captures: number;
}

interface InternalContext<Sut, W extends WorldLike> extends AtContext<Sut, W> {
  [USAGE]: Usage;
}

/** Where in the captured structure a value sits, said in words a test author can act on. */
function evidencePath(path: string): string {
  return path ? `the captured value at ${JSON.stringify(path)}` : 'the captured value';
}

function constructorName(value: object): string {
  return Object.getPrototypeOf(value)?.constructor?.name ?? 'an object with an exotic prototype';
}

/**
 * Deep-freeze a capture — and REFUSE anything that freezing does not actually make immutable.
 *
 * `Object.freeze` is shallow in a second sense nobody expects: it seals a Map's own properties
 * and leaves `set`/`delete` fully working, and the same is true of a Set, a Date and any class
 * instance with mutating methods. So a capture carrying one of those LOOKS frozen and is not —
 * which defeats the whole point of capture-once/assert-many, where one lens normalizing or
 * de-duplicating evidence in place would hide it from the next lens. Silently freezing such a
 * value is worse than rejecting it, because the immutability the suites are told to rely on
 * would be a lie in exactly the cases that matter.
 *
 * So the accepted shapes are the ones freezing genuinely closes: primitives, arrays, and plain
 * objects (`Object.prototype` or a null prototype — what `structuredClone` and object literals
 * produce). Everything else throws, naming the path, so the producer converts it to inert data
 * (a Date to an ISO string, a Map to entries) where the conversion is visible.
 */
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

export class EvidenceCapture<T, Sut = unknown, W extends WorldLike = WorldLike> {
  private result: Promise<T> | null = null;
  private producerAtId = '';

  constructor(
    readonly name: string,
    private readonly producer: (ctx: AtContext<Sut, W>) => Promise<T>,
  ) {}

  consume(ctx: InternalContext<Sut, W>): Promise<T> {
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
          const detail = err instanceof Error ? err.message : String(err);
          throw new Error(`evidence capture ${JSON.stringify(this.name)} produced by ${this.producerAtId} failed — ${detail}`, {
            cause: err,
          });
        }
      })();
    }
    return this.result;
  }
}

export function defineEvidenceCapture<T, Sut = unknown, W extends WorldLike = WorldLike>(
  name: string,
  producer: (ctx: AtContext<Sut, W>) => Promise<T>,
): EvidenceCapture<T, Sut, W> {
  return new EvidenceCapture(name, producer);
}

export function testUseProblem(opens: number, captures: number): string | null {
  return opens === 0 && captures === 0 ? 'test body never opened a fixture world or consumed trusted captured evidence' : null;
}

export async function executeRegisteredBody<Sut, W extends WorldLike>(
  atId: string,
  body: AtTestBody<Sut, W>,
  ctx: AtContext<Sut, W>,
  usage: Usage,
): Promise<void> {
  await body(ctx);
  const problem = testUseProblem(usage.opens, usage.captures);
  if (problem) throw new Error(`${atId} INVALID — ${problem}`);
}

/* ------------------------------------------------------------------------ teardown accounting */

/** One thing a test built and must give back, named so a failure says which one. */
export interface TrackedTeardown {
  /** plain words for the thing being torn down, e.g. `fixture world "req-016/base"` */
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

/**
 * Tear down everything the test built — worlds first, then harnesses, last-opened-first within
 * each — ATTEMPTING EVERY ONE and collecting the rejections rather than stopping at the first.
 *
 * Attempting all of them is the point: giving up after one rejection leaves the rest of the stack
 * standing, and a frozen clock, an armed fault or a vendor counter that survives into the next id
 * is exactly the cross-test leak the per-test teardown exists to prevent.
 */
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

/**
 * One acceptance test's whole lifecycle: run the body, tear everything down, then decide.
 *
 * WHY THE VERDICT LIVES HERE rather than in a `finally` that swallows teardown rejections —
 * which is what this used to do: a world whose teardown rejected did NOT release what it holds,
 * so the next id inherits it. Reporting that as green is a false green of the worst kind, because
 * the damage lands on a different test and the report blames the wrong id.
 *
 * When the body already failed, the body's error still wins the report: it is the more specific
 * fact, and a teardown that rejects because the body left the world half-built is a symptom, not
 * the cause. The teardown failures are printed so they are never invisible.
 */
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

async function openWorld(o: OpenOptions): Promise<{ opened: OpenWorld; harness: AtHarness }> {
  if (TIER === null) throw new AtPending(o.atId, 'tier-unset', tierError(o.requirement));

  if (!harnessModule) {
    throw new AtPending(
      o.atId,
      'harness-missing',
      `AI4DEV-3 capability modules (H2 fixtures/clock, H3 sentinels/faults, H4 oracles, ` +
        `H5 vendor sims) are not in the tree: cannot resolve "${HARNESS_MODULE}" ` +
        `from tests/at/harness (${harnessResolveError})`,
    );
  }

  const h = await harnessModule.createHarness({
    requirement: `req-${o.requirement}`,
    tier: TIER,
    configOverrides: o.configOverrides,
  });
  // Tracked from here on: every later failure must still tear the harness down.
  try {
    expect(h.tier, `harness built tier "${h.tier}" for a --tier ${TIER} run`).toBe(TIER);

    // Tier semantics: above `loop`, nothing the suite leans on may be a stand-in.
    if (TIER !== 'loop') {
      expect(await h.stubbedCapabilities(), `a ${TIER}-tier run stubbed capabilities — the gate would be grading a stand-in`).toEqual([]);
    }

    const sut = h.sut?.[o.sutKey];
    if (!sut) throw new AtPending(o.atId, 'sut-missing', o.sutMissing);

    const w = await h.fixtures.world(o.fixture);
    return { opened: { h, w, sut }, harness: h };
  } catch (err) {
    await h.teardown().catch(() => undefined);
    throw err;
  }
}

/* ------------------------------------------------------------------------------- registration */

export type AtTestBody<Sut = unknown, W extends WorldLike = WorldLike> = (
  ctx: AtContext<Sut, W>,
) => Promise<void>;

function emitRuntimeRegistration(registration: Registration): void {
  const dir = process.env.AT_REGISTRATION_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, `registration-${process.pid}.jsonl`), `${JSON.stringify(registration)}\n`, 'utf8');
}

/**
 * Register one acceptance test. The id is declared here and nowhere else.
 *
 * - a malformed id throws AT REGISTRATION — the id is checked where it is written.
 * - `expect.hasAssertions()` makes a body that asserts nothing a RED, so a tagged test cannot
 *   satisfy the bijection checker by existing.
 * - worlds AND harnesses are tracked per test and always torn down, so a frozen clock, a vendor
 *   counter or an armed fault cannot leak into the next id — and a teardown that REJECTS fails
 *   the test rather than being swallowed, because state that was never released is a defect that
 *   would otherwise land on a different id.
 */
export function atTest<Sut = unknown, W extends WorldLike = WorldLike>(
  atId: string,
  title: string,
  opts: AtTestOptions,
  body: AtTestBody<Sut, W>,
): void;
export function atTest<Sut = unknown, W extends WorldLike = WorldLike>(
  atId: string,
  title: string,
  body: AtTestBody<Sut, W>,
): void;
export function atTest<Sut = unknown, W extends WorldLike = WorldLike>(
  atId: string,
  title: string,
  optsOrBody: AtTestOptions | AtTestBody<Sut, W>,
  maybeBody?: AtTestBody<Sut, W>,
): void {
  const opts: AtTestOptions = typeof optsOrBody === 'function' ? {} : optsOrBody;
  const body = (typeof optsOrBody === 'function' ? optsOrBody : maybeBody) as AtTestBody<Sut, W>;
  if (typeof body !== 'function') throw new Error(`${atId}: atTest was given no test body`);

  const parsed = parseAtId(atId);
  const previous = registrations.get(atId);
  if (previous) throw new Error(`${atId} is registered twice ("${previous.title}" and "${title}") — one id, one test`);
  const registration = { ...parsed, title, surface: opts.surface ?? 'backend' };
  registrations.set(atId, registration);
  emitRuntimeRegistration(registration);

  const sutKey = opts.sut ?? '';
  const sutMissing =
    opts.sutMissingDetail ?? `REQ-${parsed.requirement}'s implementation is not in the tree — harness.sut.${sutKey} is absent`;

  it(`${atId} — ${title}`, async () => {
    expect.hasAssertions();

    const worlds: TrackedTeardown[] = [];
    const harnesses: TrackedTeardown[] = [];
    const usage: Usage = { opens: 0, captures: 0 };
    const ctx: InternalContext<Sut, W> = {
      atId,
      [USAGE]: usage,
      open: async (fixture = `req-${parsed.requirement}/base`, opts) => {
        const { opened, harness } = await openWorld({
          atId,
          requirement: parsed.requirement,
          sutKey,
          sutMissing,
          fixture,
          configOverrides: opts?.config,
        });
        harnesses.push({ what: `harness for fixture world ${JSON.stringify(fixture)}`, teardown: () => harness.teardown() });
        worlds.push({ what: `fixture world ${JSON.stringify(fixture)}`, teardown: () => opened.w.teardown() });
        usage.opens += 1;
        return opened as OpenWorld<Sut, W>;
      },
      capture: async (evidence) => {
        const value = await evidence.consume(ctx);
        usage.captures += 1;
        return value;
      },
    };

    await runTrackedTest(atId, () => executeRegisteredBody(atId, body, ctx, usage), worlds, harnesses);
  });
}

/* ------------------------------------------------------------------------------ suite binding */

export interface SuiteBinding {
  /** which member of `harness.sut` the whole suite drives, e.g. 'notifications' */
  sut: string;
  /** the suite's own words for "the implementation has not landed yet" */
  sutMissingDetail?: string;
}

/**
 * A suite's ONE line of harness contact: `bindSuite` pre-applies the suite's system-under-test
 * key so the test bodies say `atTest(id, title, body)` and never repeat it. It is the same
 * `atTest` above — there is one implementation, not one per suite.
 */
export function bindSuite<Sut, W extends WorldLike>(binding: SuiteBinding) {
  function bound(atId: string, title: string, opts: AtTestOptions, body: AtTestBody<Sut, W>): void;
  function bound(atId: string, title: string, body: AtTestBody<Sut, W>): void;
  function bound(
    atId: string,
    title: string,
    optsOrBody: AtTestOptions | AtTestBody<Sut, W>,
    maybeBody?: AtTestBody<Sut, W>,
  ): void {
    const opts: AtTestOptions = typeof optsOrBody === 'function' ? {} : optsOrBody;
    const body = (typeof optsOrBody === 'function' ? optsOrBody : maybeBody) as AtTestBody<Sut, W>;
    atTest<Sut, W>(atId, title, { ...opts, sut: binding.sut, sutMissingDetail: binding.sutMissingDetail }, body);
  }
  return bound;
}
