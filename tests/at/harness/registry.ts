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

/** The minimum shape the registry itself touches; a suite supplies its own richer contract. */
export interface HarnessLike {
  tier: Tier;
  stubbedCapabilities(): Promise<string[]>;
  fixtures: { world(name: string): Promise<WorldLike> };
  sut: Record<string, unknown>;
  teardown(): Promise<void>;
}

export interface WorldLike {
  teardown(): Promise<void>;
}

export interface HarnessModule {
  createHarness(opts: { requirement: string; tier: Tier }): Promise<HarnessLike>;
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

export interface OpenWorld<Sut = unknown, W = WorldLike> {
  h: HarnessLike;
  w: W;
  /** the requirement's system under test, guaranteed non-null once open() returns */
  sut: Sut;
}

/** Everything a test body is given. `atId` is read-only context, never re-supplied to open(). */
export interface AtContext<Sut = unknown, W = WorldLike> {
  atId: string;
  /** build a fresh "Given" world (and its own harness). Call it more than once for isolation. */
  open(fixture?: string): Promise<OpenWorld<Sut, W>>;
  /** consume an immutable capture whose producer proved at least one real open() */
  capture<T>(evidence: EvidenceCapture<T, Sut, W>): Promise<T>;
}

const USAGE = Symbol('at-context-usage');

interface Usage {
  opens: number;
  captures: number;
}

interface InternalContext<Sut, W extends WorldLike> extends AtContext<Sut, W> {
  [USAGE]: Usage;
}

export function freezeEvidence<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) freezeEvidence(child, seen);
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

interface OpenOptions {
  atId: string;
  requirement: string;
  sutKey: string;
  sutMissing: string;
  fixture: string;
}

async function openWorld(o: OpenOptions): Promise<{ opened: OpenWorld; harness: HarnessLike }> {
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

  const h = await harnessModule.createHarness({ requirement: `req-${o.requirement}`, tier: TIER });
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

export type AtTestBody<Sut = unknown, W = WorldLike> = (ctx: AtContext<Sut, W>) => Promise<void>;

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
 * - worlds AND harnesses are tracked per test and torn down in `finally`, so a frozen clock,
 *   a vendor counter or an armed fault cannot leak into the next id.
 */
export function atTest<Sut = unknown, W = WorldLike>(atId: string, title: string, opts: AtTestOptions, body: AtTestBody<Sut, W>): void;
export function atTest<Sut = unknown, W = WorldLike>(atId: string, title: string, body: AtTestBody<Sut, W>): void;
export function atTest<Sut = unknown, W = WorldLike>(
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

    const worlds: OpenWorld[] = [];
    const harnesses: HarnessLike[] = [];
    const usage: Usage = { opens: 0, captures: 0 };
    const ctx: InternalContext<Sut, W> = {
      atId,
      [USAGE]: usage,
      open: async (fixture = `req-${parsed.requirement}/base`) => {
        const { opened, harness } = await openWorld({
          atId,
          requirement: parsed.requirement,
          sutKey,
          sutMissing,
          fixture,
        });
        harnesses.push(harness);
        worlds.push(opened);
        usage.opens += 1;
        return opened as OpenWorld<Sut, W>;
      },
      capture: async (evidence) => {
        const value = await evidence.consume(ctx);
        usage.captures += 1;
        return value;
      },
    };

    try {
      await executeRegisteredBody(atId, body, ctx, usage);
    } finally {
      while (worlds.length)
        await worlds
          .pop()!
          .w.teardown()
          .catch(() => undefined);
      while (harnesses.length)
        await harnesses
          .pop()!
          .teardown()
          .catch(() => undefined);
    }
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
  function bound(atId: string, title: string, optsOrBody: AtTestOptions | AtTestBody<Sut, W>, maybeBody?: AtTestBody<Sut, W>): void {
    const opts: AtTestOptions = typeof optsOrBody === 'function' ? {} : optsOrBody;
    const body = (typeof optsOrBody === 'function' ? optsOrBody : maybeBody) as AtTestBody<Sut, W>;
    atTest<Sut, W>(atId, title, { ...opts, sut: binding.sut, sutMissingDetail: binding.sutMissingDetail }, body);
  }
  return bound;
}
