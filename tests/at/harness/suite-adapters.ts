/**
 * WHICH SUITES EXIST, AND WHAT EACH ONE'S ADAPTER REALLY PRODUCES — stated once, and checked.
 *
 * Before this file the harness knew its suites only as a path convention: `loadAdapter()` built
 * `suites/req-0NN/_fixture.ts` from a string and imported it as `Partial<FixtureAdapterModule>`,
 * whose `sut` is `Record<string, unknown>`. Every type the adapter's author had proved was thrown
 * away at that boundary, and the consuming suite then RESTATED it — `bindSuite<NotificationsSut,
 * World>` — as a claim nothing checked. Two independent statements about the same thing, with no
 * mechanism able to notice them diverging: the exact failure shape this project's way of work
 * exists to delete. `tests/at/typeprobes/sut-seam-legacy.probe.ts` is that hole, executed.
 *
 * So the suite stops naming its types. It names its requirement and its system-under-test key, and
 * the types are READ OFF the adapter that actually supplies them, through `SutOf` / `WorldOf`
 * below. There is one statement now, made by the producer, where it is already checked.
 *
 * ADDING A SUITE IS ONE LINE in `AdapterModules`, plus `export const requirement = 'req-0NN' as
 * const;` in that suite's `_fixture.ts`. A suite whose line is missing cannot call `bindSuite` at
 * all: the requirement literal is not a `SuiteId`, so the compiler says
 * `Type '"req-999"' is not assignable to type 'SuiteId'`. (How that constraint RENDERS depends on
 * how many suites are registered: with exactly one, TypeScript printed its single literal — the
 * message read `… to type '"req-016"'` while `req-016` was the only entry, and this comment quoted
 * it. With two or more it prints the alias name instead. The alias name is what the message says
 * now and what it will keep saying.) THAT NAMES THE PROBLEM AND NOT THE
 * REMEDY — an earlier version of this comment claimed the error tells an author what to add, and it
 * does not. tsc's messages are not ours to write, which is exactly why the two lines to add are
 * spelled out in this paragraph instead. That ergonomic cost is deliberate: an explicit, checkable
 * list of suites is worth more than a convention that silently resolves to whatever happens to be on
 * disk.
 *
 * `typeof import(...)` sits in TYPE position only, so it is erased at emit and adds no runtime edge
 * from the harness to the suites. It mirrors, at compile time, the resolution `index.ts` already
 * performs at run time.
 *
 * WHAT THIS DOES NOT CLOSE, said plainly because a closure claim wider than the truth is the very
 * defect this file removes. The threat model here is A SUITE DRIFTING FROM THE HARNESS WITH NOBODY
 * ABLE TO DETECT IT — an honest mistake that type-checks green. It is not an author determined to
 * defeat the type system, and that author is still not stopped:
 *
 *   - `any`, `as`, `@ts-ignore`, `@ts-nocheck`
 *   - mutating the adapter's object at run time
 *   - pointing `AT_REPO_ROOT` at a different tree of `_fixture.ts` files
 *   - STRUCTURAL RECONSTRUCTION: hand-building a widened context out of the DERIVED types —
 *     `Omit<AtContext<R, K>, 'open'> & { open(): Promise<OpenWorld<R, K> & { sut: { … } }> }` — and
 *     annotating a body with it. Measured compiling clean through every entry point, with no cast
 *     and no suppression; see `SeamOpenWorld` in `registry.ts` for why no type can reject it and
 *     `loop/items/AI4DEV-31/gate2-widen-reproduction.txt` for the transcript.
 *
 * No machinery is added for any of them, on purpose. Somebody who writes a cast — or who assembles
 * a widened type out of `Omit` and an intersection — has made a decision; somebody whose suite
 * quietly disagrees with its adapter has not, and only the second kind of failure is invisible.
 */

import type { AdapterFaultSeam } from './faults.ts';
import type { WorldLike } from './registry.ts';
import type { AdapterSentinelSeam } from './sentinels.ts';

/**
 * The minimum any fixture adapter owes the harness, expressed so a malformed one fails AT ITS MAP
 * ENTRY below rather than in whichever suite first opens a world.
 *
 * `fixtures.world` returning `Promise<WorldLike>` is the load-bearing part: `open()` pushes every
 * world onto the teardown stack and calls `teardown()` on it, so an adapter whose world cannot be
 * torn down would leak a frozen clock or an armed fault into the next AT id. That has to be a
 * compile error where the adapter is registered, not a run-time surprise.
 */
type AdapterShape = {
  sut: Record<string, unknown>;
  fixtures: { world(name: string): Promise<WorldLike> };
  /**
   * H3's two seams, OPTIONAL here for the same reason they are optional in `index.ts`: the runner's
   * black-box trees register disposable adapters that export three members and no more, and a
   * required member would break them at run time rather than at their map entry. Optional is not
   * silent — an adapter that supplies neither exposes no fault points and no sentinel scopes, so
   * arming a fault or scanning a scope is a refusal in `guards.ts`'s own words.
   */
  faults?: AdapterFaultSeam;
  sentinels?: AdapterSentinelSeam;
  teardown(): Promise<void>;
};

/**
 * What a fixture MODULE must export, parameterized by the key it is registered under.
 *
 * `requirement: R` is what ties the three facts that were previously independent: the key used for
 * the TYPE lookup here, the module those types are read from, and the module `loadAdapter()`
 * actually imports at run time. Without it `'req-016'` could name `req-017/_fixture.ts` by a typo
 * and nothing would notice — the type-check would describe one suite while the run drove another.
 * The map entry checks the first two; `loadAdapter()` re-checks the same literal against the
 * requirement it was asked for, which is what covers the third.
 *
 * The parameter list is `never[]` because this constraint is about the module's SHAPE, not about
 * how the harness calls it; `index.ts` owns the call and is checked against its own signature.
 */
type AdapterModuleFor<R extends string> = {
  requirement: R;
  createFixtureAdapter: (...args: never[]) => Promise<AdapterShape> | AdapterShape;
};

/**
 * The identity function of the type world: it accepts `M` unchanged, but only after every entry has
 * been checked against `AdapterModuleFor<its own key>`. Writing the constraint on the alias itself
 * would not do this — a plain `type AdapterModules = { … }` states shapes and constrains nothing,
 * which is what the first draft of this design got wrong.
 */
type CheckedAdapterModules<M extends { [R in keyof M & string]: AdapterModuleFor<R> }> = M;

/** THE LIST. One line per suite; the key is the requirement id the runner and the loader use. */
export type AdapterModules = CheckedAdapterModules<{
  'req-001': typeof import('../suites/req-001/_fixture.ts');
  'req-016': typeof import('../suites/req-016/_fixture.ts');
}>;

/** Every requirement that has a registered adapter. A suite outside this set cannot bind. */
export type SuiteId = keyof AdapterModules & string;

/** What the adapter's factory really returns, awaited — the single source for everything below. */
type AdapterOf<R extends SuiteId> = Awaited<ReturnType<AdapterModules[R]['createFixtureAdapter']>>;

/** The whole `harness.sut` map for a suite, at the types its adapter proved. */
export type SutMapOf<R extends SuiteId> = AdapterOf<R>['sut'];

/** The keys a suite may legally bind to. A misspelling is a compile error, not a run-time `sut-missing`. */
export type SutKeyOf<R extends SuiteId> = keyof SutMapOf<R> & string;

/** The system under test at one key, exactly as the adapter declares it. */
export type SutOf<R extends SuiteId, K extends SutKeyOf<R>> = SutMapOf<R>[K];

/**
 * The world the adapter's `fixtures.world()` really produces.
 *
 * Derived from `fixtures.world` and NOT from `SutOf` — same source, two independent paths, because
 * welding the world to the system under test (or to the harness) is the conflation AI4DEV-24 shut
 * twice. For REQ-016 this resolves to the concrete fixture-world class rather than the `World`
 * interface the suite used to name, which is more honest: it is what the producer actually returns,
 * and bodies typed against `World` still work because the class implements it.
 */
export type WorldOf<R extends SuiteId> = Awaited<ReturnType<AdapterOf<R>['fixtures']['world']>>;
