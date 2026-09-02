import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT } from './check.ts';
import { ControlledClock, RealClock } from './clock.ts';
import { createConfigRegistry, type ConfigRegistry } from './config.ts';
import type { AtHarness, StaticScan } from './contracts.ts';
import { createFaults, type AdapterFaultSeam } from './faults.ts';
import { createFixtureSeed, FixtureWorldStore } from './fixtures.ts';
import { createLiveEmail, type LiveVendors } from './live-email.ts';
import { CapabilityPending, type ConfigOverrides, type Tier } from './registry.ts';
import { createSentinels, type AdapterSentinelSeam } from './sentinels.ts';
import { createEmailProviderSim, type EmailProviderPort } from './vendors.ts';

interface FixtureAdapter {
  fixtures: { world(name: string): Promise<{ teardown(): Promise<void> }> };
  sut: Record<string, unknown>;
  /**
   * OPTIONAL, and refused at use rather than ignored. The runner's own black-box trees write
   * disposable adapters that export `sut`, `fixtures` and `teardown` and nothing else, so a
   * required member here would break them at run time. Absence is not permission to no-op: an
   * adapter that offers no fault seam exposes no fault points, so `faults.at()` refuses through
   * `faultPointProblem` in the guard's own words, and a scan of any scope is refused the same way.
   */
  faults?: AdapterFaultSeam;
  sentinels?: AdapterSentinelSeam;
  teardown(): Promise<void>;
}

interface FixtureAdapterModule {
  /** the requirement this adapter declares itself to be, e.g. 'req-016' — see loadAdapter() */
  requirement: string;
  createFixtureAdapter(opts: {
    clock: ControlledClock;
    worlds: FixtureWorldStore;
    config: ConfigRegistry;
    /**
     * The SUT-facing half of H5's provider seam. ADDITIVE on the options object rather than a new
     * required export, so the runner's disposable black-box adapters — which take an options object
     * they largely ignore — keep working untouched.
     */
    vendors: { email: EmailProviderPort };
  }): Promise<FixtureAdapter> | FixtureAdapter;
}

/**
 * The adapter is resolved through REPO_ROOT rather than relative to this file, so that the suites
 * directory the harness loads from is the SAME tree the runner and the bijection checker read.
 * They agree by construction, including when `AT_REPO_ROOT` points all three at a disposable
 * fixture tree for the runner's own black-box tests.
 */
function adapterUrl(requirement: string): string {
  return pathToFileURL(join(REPO_ROOT, 'tests', 'at', 'suites', requirement, '_fixture.ts')).href;
}

async function loadAdapter(
  requirement: string,
  clock: ControlledClock,
  worlds: FixtureWorldStore,
  config: ConfigRegistry,
  vendors: { email: EmailProviderPort },
): Promise<{ adapter: FixtureAdapter; moduleUrl: string }> {
  const moduleUrl = adapterUrl(requirement);
  let module: Partial<FixtureAdapterModule>;
  try {
    module = (await import(/* @vite-ignore */ moduleUrl)) as Partial<FixtureAdapterModule>;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`no fixture adapter for ${requirement} at ${moduleUrl} — ${detail}`);
  }
  if (typeof module.createFixtureAdapter !== 'function') {
    throw new Error(`fixture adapter for ${requirement} exports no createFixtureAdapter()`);
  }

  /*
   * THE ADAPTER SAYS WHO IT IS, AND IS HELD TO IT.
   *
   * `harness/suite-adapters.ts` reads a suite's system-under-test and world types from the module
   * its map names, while THIS function loads a module from a path built out of a string. Those were
   * two independent facts: a mistyped map entry, a renamed directory or an `AT_REPO_ROOT` pointing
   * somewhere else would have made the type-check describe one suite while the run drove another,
   * and every layer would have looked correct on its own.
   *
   * The map entry is constrained to match this literal at compile time; the same literal is checked
   * here against the requirement actually requested. So the key, the module the types came from and
   * the module really imported are one self-declared value, checked at both ends.
   *
   * A MISSING literal is an error too, not a skipped check — a guard that switches itself off when a
   * field is absent is the hole again, arriving through the door marked convenience.
   */
  if (module.requirement !== requirement) {
    throw new Error(
      `fixture adapter at ${moduleUrl} declares requirement ` +
        `${module.requirement === undefined ? '<nothing: it exports no `requirement`>' : JSON.stringify(module.requirement)} ` +
        `but was loaded as ${JSON.stringify(requirement)} — the suite's types would be read off one ` +
        `module while the run drove another. Add \`export const requirement = ${JSON.stringify(requirement)} as const;\` ` +
        `to that file, or correct whichever of the two names is wrong.`,
    );
  }

  return { adapter: await module.createFixtureAdapter({ clock, worlds, config, vendors }), moduleUrl };
}

/**
 * WHAT A SUITE'S LIVE ADAPTER MODULE MUST EXPORT — `_live.ts`, beside its `_fixture.ts`.
 *
 * A SEPARATE MODULE AND A SEPARATE FACTORY SIGNATURE, never a tier flag on the loop one. The loop
 * factory takes a `ControlledClock`, and above the loop tier there is no such thing to hand it: a
 * clock that could be commanded forward would not move a real GoTrue by one millisecond. So the two
 * factories take different things because they are given different worlds, and the type system says
 * so rather than a comment.
 */
interface LiveAdapterModule {
  requirement: string;
  createLiveAdapter(opts: {
    /** the coordinates the runner validated — never re-derived here */
    slot: LiveSlotCoordinates;
    vendors: LiveVendors;
    config: ConfigRegistry;
    worlds: FixtureWorldStore;
  }): Promise<FixtureAdapter> | FixtureAdapter;
}

/** The four strings the runner validated, plus the mail catcher the stack's own status reported. */
export interface LiveSlotCoordinates {
  apiUrl: string;
  dbUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  mailUrl: string;
}

function liveAdapterUrl(requirement: string): string {
  return pathToFileURL(join(REPO_ROOT, 'tests', 'at', 'suites', requirement, '_live.ts')).href;
}

/**
 * A suite's live adapter, or `null` when it has none.
 *
 * ABSENCE IS NOT AN ERROR AND IS NOT A LICENCE. A suite with no live adapter falls back to its LOOP
 * fixture and `createHarness` sets `live: false`, so `registry.ts` refuses every `open()` above loop
 * before the body runs. That is the honest outcome: a suite nobody has made live yet is not live,
 * and it says so per id instead of failing the whole run in a way no declaration can describe.
 *
 * A module that EXISTS and is broken is a different thing entirely and throws, because a suite whose
 * live adapter fails to import has a defect rather than an absence.
 */
async function loadLiveAdapterModule(requirement: string): Promise<{ module: LiveAdapterModule; moduleUrl: string } | null> {
  const moduleUrl = liveAdapterUrl(requirement);
  if (!existsSync(join(REPO_ROOT, 'tests', 'at', 'suites', requirement, '_live.ts'))) return null;

  let loaded: Partial<LiveAdapterModule>;
  try {
    loaded = (await import(/* @vite-ignore */ moduleUrl)) as Partial<LiveAdapterModule>;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`the live adapter for ${requirement} at ${moduleUrl} could not be imported — ${detail}`);
  }
  if (typeof loaded.createLiveAdapter !== 'function') {
    throw new Error(`the live adapter for ${requirement} at ${moduleUrl} exports no createLiveAdapter()`);
  }
  // THE SAME SELF-DECLARATION THE LOOP LOADER ENFORCES, and for the same reason: a renamed
  // directory or a redirected repo root would otherwise drive one suite while the types described
  // another. A missing literal is an error, never a skipped check.
  if (loaded.requirement !== requirement) {
    throw new Error(
      `the live adapter at ${moduleUrl} declares requirement ` +
        `${loaded.requirement === undefined ? '<nothing: it exports no `requirement`>' : JSON.stringify(loaded.requirement)} ` +
        `but was loaded as ${JSON.stringify(requirement)}.`,
    );
  }
  return { module: loaded as LiveAdapterModule, moduleUrl };
}

/** The coordinates this child was handed, read off its own environment and never recomputed. */
function liveCoordinatesFromEnv(): LiveSlotCoordinates {
  const env = process.env;
  return {
    apiUrl: env.AT_SUPABASE_URL ?? '',
    dbUrl: env.AT_SUPABASE_DB_URL ?? '',
    anonKey: env.AT_SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: env.AT_SUPABASE_SERVICE_ROLE_KEY ?? '',
    mailUrl: env.AT_SUPABASE_MAIL_URL ?? '',
  };
}

/** A typed seam for later slices. Any attempted use fails with the capability names, never a no-op. */
export function refusing<T extends object>(...capabilities: string[]): T {
  const names = [...new Set(capabilities)];
  return new Proxy(
    {},
    {
      get() {
        throw new CapabilityPending(names);
      },
    },
  ) as T;
}

/**
 * The return type is annotated, not inferred, and that annotation is load-bearing: it is what makes
 * the shared contract a checked promise rather than a hopeful one. Inferred, this factory produced
 * `object` for every pending seam — `refusing<T extends object>()` has no inference site,
 * so `T` fell back to its constraint — and the result was not assignable to `AtHarness` at all.
 * With the annotation, dropping or misnaming a contract member is a compile error here, where it is
 * written, instead of a surprise in whichever suite reaches for it.
 */
export async function createHarness(opts: {
  requirement: string;
  tier: Tier;
  configOverrides?: ConfigOverrides;
}): Promise<AtHarness> {
  const worlds = new FixtureWorldStore(createFixtureSeed());
  const config = createConfigRegistry(opts.configOverrides);
  const staticScan = refusing<StaticScan>('H3 static provider scan');

  const finish = (parts: {
    clock: AtHarness['clock'];
    adapter: FixtureAdapter;
    vendors: AtHarness['vendors'];
    live: boolean;
  }): AtHarness => {
    let tornDown = false;
    return {
      tier: opts.tier,
      live: parts.live,
      clock: parts.clock,
      fixtures: parts.adapter.fixtures,
      // The `sut.` prefix is composed onto a key only in `registry.ts` (`aboveLoopStandInRefusal`).
      // Here the adapter's `sut` map is handed through as the adapter exported it.
      sut: parts.adapter.sut,
      sentinels: createSentinels(parts.adapter.sentinels),
      faults: createFaults(parts.adapter.faults),
      // 'H3 sentinels' went from this list in the change that made planting work, and
      // 'H5 email provider simulator' goes in the change that builds the simulator above. The seam
      // names the whole missing set so its first throw reports all of it at once; the moment one of
      // them lands, keeping its name here is a declared fact that has drifted from a real one.
      // `AT-016.01` stays red — `providerClientImporters()` is what throws — but the reason it is red
      // changed, and `tests/at/expected/req-016.json` states the same one name for the same reason.
      static: staticScan,
      vendors: parts.vendors,
      config,
      teardown: async () => {
        if (tornDown) return;
        tornDown = true;
        await parts.adapter.teardown();
        await worlds.teardown();
      },
    };
  };

  if (opts.tier === 'loop') {
    const clock = new ControlledClock();
    const provider = createEmailProviderSim();
    const { adapter } = await loadAdapter(opts.requirement, clock, worlds, config, { email: provider.port });
    return finish({ clock, adapter, vendors: { email: provider.sim }, live: false });
  }

  const coordinates = liveCoordinatesFromEnv();
  const live = await loadLiveAdapterModule(opts.requirement);
  if (live) {
    const vendors = await createLiveEmail({ catcherUrl: coordinates.mailUrl });
    const adapter = await live.module.createLiveAdapter({
      slot: coordinates,
      vendors,
      config,
      worlds,
    });
    return finish({
      clock: new RealClock() as unknown as AtHarness['clock'],
      adapter,
      vendors: vendors as unknown as AtHarness['vendors'],
      live: true,
    });
  }

  const provider = createEmailProviderSim();
  const { adapter } = await loadAdapter(opts.requirement, new ControlledClock(), worlds, config, {
    email: provider.port,
  });
  return finish({
    clock: new RealClock() as unknown as AtHarness['clock'],
    adapter,
    vendors: { email: provider.sim },
    live: false,
  });
}
