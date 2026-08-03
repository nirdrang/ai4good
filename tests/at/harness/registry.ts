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
import type { SuiteId, SutKeyOf, SutOf, WorldOf } from './suite-adapters.ts';

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

/**
 * What a suite may vary PER TEST.
 *
 * Neither the requirement nor the system-under-test key is here any more. Both come from the
 * binding, and both now determine TYPES (`SutOf` / `WorldOf`), so a per-test override would let one
 * test in a suite describe a different seam from the one its neighbours describe — which is the
 * drift this whole item exists to make impossible.
 */
export interface AtTestOptions {
  /** `ui` marks the test as part of a wiring leaf's `--wired` re-run selection */
  surface?: Surface;
}

/**
 * WHICH SUITE THIS IS. The two facts a suite supplies, and the only two it is allowed to supply.
 *
 * `requirement` is a key of `suite-adapters.ts`'s registry, so it is not a free string: a
 * requirement with no registered adapter cannot be bound at all. `sut` is constrained to the keys
 * that adapter really exposes, so a misspelling is a compile error instead of a run-time
 * `sut-missing`. Everything else about the seam — the system under test's shape and the fixture
 * world's shape — is DERIVED from those two, never stated.
 */
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
 * The exploit needed `W` at its DEFAULT, which is what made it easy to miss: a suite that pinned its
 * own world type (as REQ-016 did) resolved `w` to that type and never saw the merged member — which
 * hid the hole rather than closing it.
 *
 * A suite can no longer pin a world type at all. AI4DEV-31 derives `w` from the adapter that really
 * produces it, so this type's job is now only what it always said on the tin: the minimum the
 * harness needs in order to tear a world down, which is why `suite-adapters.ts` constrains every
 * registered adapter's `fixtures.world()` to return one.
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

/**
 * THE STRUCTURE of what `open()` hands back, parameterized by shape and NOT EXPORTED.
 *
 * The exported `OpenWorld` below takes a requirement and a sut key instead, and this is why. Any
 * exported type generic over the SUT's shape is a way back into the hole, and not through the door
 * anyone was watching: leave `bindSuite` alone, and widen the type at the BODY instead —
 * `async (ctx: AtContext<NotificationsSut & { invented?: string }, World>) => …` — then read the
 * invented member. It needs no cast and no suppression. It was measured compiling clean against the
 * first version of this change, with every other door already shut.
 *
 * NOTHING STRUCTURAL CAN REJECT IT, which is the part worth writing down. `NotificationsSut` and
 * `NotificationsSut & { invented?: string }` are assignable in BOTH directions — an optional member
 * adds no obligation — so they are indistinguishable to the assignability check however the
 * variance is arranged. Marking the parameter invariant does not help; nor does any conditional
 * "exactly this type" trick, because both directions genuinely hold.
 *
 * So what this closes is the INVITED spelling. `OpenWorld`, `AtContext`, `AtTestBody` and
 * `EvidenceCapture` are exported over `<R, K>` — a requirement and a sut key, both of which derive —
 * and the shape-parameterized versions stay inside this module. The old API positively ASKED a suite
 * to name its seam types; the new one hands it nothing to name them with. That is the same decision
 * D1 made for `bindSuite`, carried to the rest of the exported surface rather than stopped one type
 * short.
 *
 * IT IS NOT UNSPELLABLE, AND AN EARLIER VERSION OF THIS COMMENT SAID IT WAS. Gate 2 refuted that by
 * compiling the refutation, and it was reproduced here before being accepted. A determined author
 * rebuilds the widened type out of the derived ones:
 *
 *   type WidenedCtx = Omit<AtContext<'req-016','notifications'>, 'open'> & {
 *     open(): Promise<OpenWorld<'req-016','notifications'> & { sut: { invented?: string } }>;
 *   };
 *
 * Exit 0 — through the bound `atTest`, the raw `atTest` and `defineEvidenceCapture` alike, with no
 * cast, no `any`, no suppression and no module augmentation. NOTHING IN THE TYPE SYSTEM CAN STOP IT,
 * for the reason two paragraphs up: the widened type and the derived one are assignable in both
 * directions, so no annotation the harness writes can tell them apart. Closing it means INSPECTING
 * SOURCE — permitting only inline, unannotated bodies — which is a different kind of machinery,
 * filed as its own item rather than built here (AI4DEV-37).
 *
 * The line is worth stating as a rule rather than as an excuse. What is closed is a suite NAMING the
 * seam types, and with it every route the API used to invite. What is open is a hand-written
 * structural reconstruction, which is a decision somebody takes rather than a mistake they make.
 * `tests/at/typeprobes/sut-seam.probe.ts` carries it verbatim as a documented known-open case (it
 * cannot be an active probe there, because that program must not compile and this attack does), and
 * `loop/items/AI4DEV-31/gate2-widen-reproduction.txt` is the compile transcript with its controls.
 */
type SeamOpenWorld<Sut = unknown, W extends WorldLike = WorldLike> = {
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
   * `h` is deliberately NOT re-parameterized by AI4DEV-31 either. Deriving `w` and `sut` from the
   * adapter does not license pushing them back into the harness: that is the same door, and it
   * stays shut.
   */
  h: AtHarness;
  /**
   * The fixture world, at the type the requirement's ADAPTER really returns — `WorldOf<R>`, read
   * off `fixtures.world`'s return type in `suite-adapters.ts`.
   *
   * It used to be the suite's own type argument, asserted rather than verified, so
   * `bindSuite<NotificationsSut, AnythingAtAll>` type-checked green and a body could read members
   * no fixture supplies. `tests/at/typeprobes/sut-seam-legacy.probe.ts` is that attack, kept alive:
   * it compiled clean before this change and must fail now.
   */
  w: W;
  /**
   * The requirement's system under test, at the type its ADAPTER declares (`SutOf<R, K>`), and
   * guaranteed non-null once open() returns.
   *
   * WHAT IS ACTUALLY CHECKED, precisely, because a closure claim wider than the truth is the defect
   * this item removes: the adapter annotates what it builds (`const sut: NotificationsSut = …`), so
   * the shape is proven at the producer; the suite reads that type instead of restating it; the
   * `requirement` literal ties the map entry, the module the type came from and the module
   * `loadAdapter()` really imports to one self-declared value, checked at compile time AND again at
   * run time. One assertion survives, at the end of `open()`, and it is commented there.
   *
   * WHAT IS NOT CHECKED: `any`, `as`, `@ts-ignore`, `@ts-nocheck`, mutating the adapter's object at
   * run time, pointing `AT_REPO_ROOT` at a different tree, and REBUILDING A WIDENED CONTEXT BY HAND
   * out of the derived types (measured, and documented on `SeamOpenWorld` above) all still work. The
   * threat model is a suite DRIFTING from its harness with nobody able to notice — an honest mistake
   * that type-checks green — not an author set on defeating the type system, who can always write a
   * cast, and who now has to write something at least as deliberate as one.
   */
  sut: Sut;
};

/**
 * What `open()` hands a test body, for the suite bound to requirement `R` and sut key `K`.
 *
 * Named by TWO STRINGS, never by a shape — see `SeamOpenWorld` above for why that distinction is
 * the whole protection rather than a stylistic preference.
 */
export type OpenWorld<R extends SuiteId, K extends SutKeyOf<R>> = SeamOpenWorld<SutOf<R, K>, WorldOf<R>>;

export interface OpenOverrides {
  /**
   * Re-tune pinned values for THIS world only, so one authored body can be run against two
   * materially different configurations. A key the at-config registry does not already carry
   * throws: an override may re-tune a knob that exists, never invent one the product has not
   * got.
   */
  config?: ConfigOverrides;
}

/** The STRUCTURE of what a test body is given — not exported, for the reason on `SeamOpenWorld`. */
type SeamContext<Sut = unknown, W extends WorldLike = WorldLike> = {
  atId: string;
  /** build a fresh "Given" world (and its own harness). Call it more than once for isolation. */
  open(fixture?: string, opts?: OpenOverrides): Promise<SeamOpenWorld<Sut, W>>;
  /** consume an immutable capture whose producer proved at least one real open() */
  capture<T>(evidence: EvidenceCaptureImpl<T, Sut, W>): Promise<T>;
};

/** Everything a test body is given. `atId` is read-only context, never re-supplied to open(). */
export type AtContext<R extends SuiteId, K extends SutKeyOf<R>> = SeamContext<SutOf<R, K>, WorldOf<R>>;

const USAGE = Symbol('at-context-usage');

interface Usage {
  opens: number;
  captures: number;
}

/**
 * NOT EXPORTED, and a type alias rather than an interface, for the two different reasons this file
 * keeps apart: not exported so no suite can name it, an alias so nothing can merge a member into it
 * even from inside this module. It is reachable from a test body — `capture()` hands it to an
 * evidence producer — and everything on that path obeys the alias rule.
 */
type InternalContext<Sut, W extends WorldLike> = SeamContext<Sut, W> & {
  [USAGE]: Usage;
};

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

/**
 * The implementation class, DELIBERATELY NOT EXPORTED — only the type alias below is.
 *
 * An exported class is a value with a public constructor, so `new EvidenceCapture<T, Anything,
 * AnythingElse>(name, producer)` was a way to hand a producer a fabricated `AtContext` without ever
 * touching `bindSuite`: the same lie as the one AI4DEV-31 closes at `open()`, reached through a
 * `new`. Exporting only the type removes the constructor from a suite's reach, and has the second
 * effect of making `EvidenceCapture` a type ALIAS, which declaration merging cannot open.
 */
class EvidenceCaptureImpl<T, Sut = unknown, W extends WorldLike = WorldLike> {
  private result: Promise<T> | null = null;
  private producerAtId = '';

  constructor(
    readonly name: string,
    /** the suite this capture reads the seam of — it is in the failure text so a red says whose */
    readonly requirement: string,
    private readonly producer: (ctx: SeamContext<Sut, W>) => Promise<T>,
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
          throw new Error(
            `evidence capture ${JSON.stringify(this.name)} (${this.requirement}) produced by ${this.producerAtId} failed — ${detail}`,
            { cause: err },
          );
        }
      })();
    }
    return this.result;
  }
}

/**
 * An immutable capture, consumable by any test in the suite that defined it.
 *
 * A TYPE, never the class — and named by a requirement and a sut key, never by a shape. Both halves
 * matter: the class would expose a constructor that takes a producer at any types, and shape
 * parameters would let a body widen the context it is handed. See `SeamOpenWorld`.
 */
export type EvidenceCapture<T, R extends SuiteId, K extends SutKeyOf<R>> = EvidenceCaptureImpl<T, SutOf<R, K>, WorldOf<R>>;

/**
 * `defineEvidenceCapture` was the SECOND door to the seam AI4DEV-31 closes, and closing `bindSuite`
 * alone would have moved the defect rather than removed it: this function handed its producer a
 * full `AtContext<Sut, W>` at whatever types the caller named, so a suite that never called
 * `bindSuite` could still declare a system under test and a world out of nothing and read both green.
 *
 * So it takes the BINDING and derives, exactly as `atTest` does. There is no type argument left to
 * lie with: `SutOf<R, K>` and `WorldOf<R>` come from the adapter registered under `R`.
 *
 * A `const` typed by a call-signature alias, NOT an exported `function` declaration — that is not
 * stylistic. Gate 1 measured that an exported function declaration can be given a fresh generic
 * overload through `declare module`, restoring the fabricated type argument, and that type aliases
 * do not protect it. A `const` has no declaration to merge an overload into.
 */
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

/**
 * Runs one body and refuses a pass that observed nothing.
 *
 * Still parameterized by SHAPE rather than by `<R, K>`, and that is not an oversight. It is not a
 * door to the seam: it never produces a harness-backed value, so the only context it can be given
 * is one the caller built by hand — fabricating a type there is a caller lying to itself about its
 * own object, with no harness claim anywhere in it. Keeping the structural signature is also what
 * lets `conformance.selftest.ts` drive it with a hand-built context, which is the point of the
 * false-green reproduction it appears in.
 */
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

/**
 * Builds a harness and a world, at the types the HARNESS can actually prove: `sut` is `unknown`
 * (`h.sut[key]` on a concrete `AtHarness`) and `w` is a bare `WorldLike`. It deliberately knows
 * nothing about any suite — the narrowing to that suite's derived types happens once, at the end of
 * `open()`, where the comment says exactly what is still taken on trust.
 */
async function openWorld(o: OpenOptions): Promise<{ opened: SeamOpenWorld; harness: AtHarness }> {
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

/** One authored test body, for the suite bound to requirement `R` and sut key `K`. */
export type AtTestBody<R extends SuiteId, K extends SutKeyOf<R>> = (ctx: AtContext<R, K>) => Promise<void>;

function emitRuntimeRegistration(registration: Registration): void {
  const dir = process.env.AT_REGISTRATION_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, `registration-${process.pid}.jsonl`), `${JSON.stringify(registration)}\n`, 'utf8');
}

/**
 * THE ONE PLACE the AT id's requirement and the binding's requirement are made to agree.
 *
 * They are two independent strings that must denote the same suite: the id decides which fixture
 * adapter `createHarness()` loads at RUN time (`openWorld` passes `parsed.requirement` straight
 * through), while the binding decides which adapter the TYPES were read off at compile time. Left
 * unchecked, `AT-017.03` registered through a suite bound to `req-016` would drive req-017's
 * implementation while every type in the body described req-016's, and both halves would look fine.
 *
 * The formats differ and the comparison must normalize, or it would reject every valid suite:
 * `parseAtId('AT-016.01').requirement` is `"016"`, whereas the binding and the registry key are
 * `"req-016"`.
 *
 * The field stays MANDATORY. Making the check fire only when a requirement happens to be supplied
 * would reopen the hole through the door marked convenience — so a binding with no requirement is
 * its own error, not a skipped check.
 */
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

/**
 * Register one acceptance test. The id is declared here and nowhere else.
 *
 * - a malformed id throws AT REGISTRATION — the id is checked where it is written.
 * - the id's requirement must match the suite's binding, for the reason above.
 * - `expect.hasAssertions()` makes a body that asserts nothing a RED, so a tagged test cannot
 *   satisfy the bijection checker by existing.
 * - worlds AND harnesses are tracked per test and always torn down, so a frozen clock, a vendor
 *   counter or an armed fault cannot leak into the next id — and a teardown that REJECTS fails
 *   the test rather than being swallowed, because state that was never released is a defect that
 *   would otherwise land on a different id.
 *
 * THE BODY'S TYPES ARE DERIVED, NOT ACCEPTED. `Sut` and `W` used to be this function's own type
 * parameters, filled in by whatever the suite wrote; now they are `SutOf<R, K>` and `WorldOf<R>`,
 * read off the adapter registered under `R` in `suite-adapters.ts`. There is no type argument left
 * for a suite to lie with.
 *
 * A `const` typed by a call-signature alias, NOT an exported `function` declaration, for the reason
 * given on `defineEvidenceCapture`: a function declaration accepts a merged-in overload and a
 * `const` does not.
 */
type AtTestFn = {
  <R extends SuiteId, K extends SutKeyOf<R>>(
    atId: string,
    title: string,
    opts: AtTestOptions & SuiteBinding<R, K>,
    body: AtTestBody<R, K>,
  ): void;
};

export const atTest: AtTestFn = <R extends SuiteId, K extends SutKeyOf<R>>(
  atId: string,
  title: string,
  opts: AtTestOptions & SuiteBinding<R, K>,
  body: AtTestBody<R, K>,
): void => {
  if (typeof body !== 'function') throw new Error(`${atId}: atTest was given no test body`);

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

  it(`${atId} — ${title}`, async () => {
    expect.hasAssertions();

    const worlds: TrackedTeardown[] = [];
    const harnesses: TrackedTeardown[] = [];
    const usage: Usage = { opens: 0, captures: 0 };
    const ctx: InternalContext<SutOf<R, K>, WorldOf<R>> = {
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
        // THE ONE SURVIVING ASSERTION, and exactly what it still takes on trust.
        //
        // `h.sut[key]` is `unknown` and `h.fixtures.world()` is `WorldSeam`, because `h` is the
        // concrete `AtHarness` the factory is checked to produce and that type deliberately says
        // nothing about any one suite. No run-time value can prove its own static type, so this
        // relabelling cannot be removed — only moved to where the claim is smallest.
        //
        // What changed is WHOSE claim it is. It used to be the suite's: `bindSuite<X, Y>` named two
        // types and this line stamped them onto whatever the harness returned, so any pair of names
        // was accepted. Now both come from `suite-adapters.ts`, which reads them off the adapter
        // module that the `requirement` literal proves is the module `loadAdapter()` imports —
        // checked at the map entry, and again at run time in `index.ts`.
        //
        // So what remains unchecked here is narrow and nameable: that the object `createHarness()`
        // built at run time really is the one that module's `createFixtureAdapter()` returned. That
        // holds unless somebody casts inside `index.ts` or mutates the adapter after it is built —
        // both trusted-author escapes this item does not claim to close.
        return opened as OpenWorld<R, K>;
      },
      capture: async (evidence) => {
        const value = await evidence.consume(ctx);
        usage.captures += 1;
        return value;
      },
    };

    await runTrackedTest(atId, () => executeRegisteredBody(atId, body, ctx, usage), worlds, harnesses);
  });
};

/* ------------------------------------------------------------------------------ suite binding */

/** `atTest`, with the binding already applied — so bodies say `atTest(id, title, body)`. */
type BoundAtTest<R extends SuiteId, K extends SutKeyOf<R>> = {
  (atId: string, title: string, opts: AtTestOptions, body: AtTestBody<R, K>): void;
  (atId: string, title: string, body: AtTestBody<R, K>): void;
};

/** `defineEvidenceCapture`, with the binding already applied. */
type BoundDefineEvidenceCapture<R extends SuiteId, K extends SutKeyOf<R>> = <T>(
  name: string,
  producer: (ctx: AtContext<R, K>) => Promise<T>,
) => EvidenceCapture<T, R, K>;

/**
 * A suite's ONE line of harness contact: name the requirement and the system-under-test key, and
 * get back both entry points with the seam types already derived from that suite's adapter.
 *
 * BOTH are returned because both were doors. Closing `atTest` alone would have moved the defect one
 * import along — `defineEvidenceCapture` handed its producer the same `AtContext`, so a suite could
 * fabricate a system under test there instead and read it green, and the item would have shipped
 * claiming a closure it did not have.
 *
 * It is the same `atTest` and the same `defineEvidenceCapture` as above: one implementation, not
 * one per suite. And it is a `const`, not an exported `function` declaration, so no suite can merge
 * an extra generic overload onto it through `declare module` and restore the fabricated arguments.
 */
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
    optsOrBody: AtTestOptions | AtTestBody<R, K>,
    maybeBody?: AtTestBody<R, K>,
  ): void => {
    const opts: AtTestOptions = typeof optsOrBody === 'function' ? {} : optsOrBody;
    const body = (typeof optsOrBody === 'function' ? optsOrBody : maybeBody) as AtTestBody<R, K>;
    atTest<R, K>(atId, title, { ...opts, ...binding }, body);
  };

  // Annotated here rather than left to the contextual type from `BindSuiteFn`: inside the object
  // literal the context would supply that alias's own `R`/`K`, which TypeScript treats as unrelated
  // to this implementation's — the "two different types with this name exist" rejection. Naming the
  // type against the local parameters is what makes `binding` line up with the call below.
  const boundCapture: BoundDefineEvidenceCapture<R, K> = (name, producer) =>
    defineEvidenceCapture(binding, name, producer);

  return {
    atTest: boundAtTest,
    defineEvidenceCapture: boundCapture,
  };
};
