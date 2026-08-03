import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { pendingCapability, realCapability, standInCapability, stubbedCapabilityNames, type Capability } from './capabilities.ts';
import { REPO_ROOT } from './check.ts';
import { ControlledClock } from './clock.ts';
import { createConfigRegistry, type ConfigRegistry } from './config.ts';
import type { AtHarness, Faults, Sentinels, StaticScan, Vendors } from './contracts.ts';
import { createFixtureSeed, FixtureWorldStore } from './fixtures.ts';
import type { ConfigOverrides, Tier } from './registry.ts';

interface FixtureAdapter {
  fixtures: { world(name: string): Promise<{ teardown(): Promise<void> }> };
  sut: Record<string, unknown>;
  teardown(): Promise<void>;
}

interface FixtureAdapterModule {
  /** the requirement this adapter declares itself to be, e.g. 'req-016' — see loadAdapter() */
  requirement: string;
  createFixtureAdapter(opts: {
    clock: ControlledClock;
    worlds: FixtureWorldStore;
    config: ConfigRegistry;
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
): Promise<FixtureAdapter> {
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

  return module.createFixtureAdapter({ clock, worlds, config });
}

/**
 * The return type is annotated, not inferred, and that annotation is load-bearing: it is what makes
 * the shared contract a checked promise rather than a hopeful one. Inferred, this factory produced
 * `object` for every pending seam — `pendingCapability<T extends object>()` has no inference site,
 * so `T` fell back to its constraint — and the result was not assignable to `AtHarness` at all.
 * With the annotation, dropping or misnaming a contract member is a compile error here, where it is
 * written, instead of a surprise in whichever suite reaches for it.
 */
export async function createHarness(opts: {
  requirement: string;
  tier: Tier;
  configOverrides?: ConfigOverrides;
}): Promise<AtHarness> {
  const clock = standInCapability('clock.controlled', new ControlledClock());
  const worlds = new FixtureWorldStore(createFixtureSeed());
  // REAL, not a stand-in: `atconfig.ts` IS the registry of pinned values, so what a test reads
  // here is the article itself. Marking it stand-in would tell an integration-tier run that the
  // gate is grading a substitute, which would be a lie in the other direction.
  const config = realCapability('config.registry', createConfigRegistry(opts.configOverrides));
  const adapter = await loadAdapter(opts.requirement, clock.value, worlds, config.value);
  const fixtures = standInCapability('fixtures.worlds', adapter.fixtures);
  const sutCapabilities: Capability<unknown>[] = Object.entries(adapter.sut).map(([name, value]) =>
    standInCapability(`sut.${name}`, value),
  );
  const constructed: Capability<unknown>[] = [clock, fixtures, config, ...sutCapabilities];

  let tornDown = false;
  return {
    tier: opts.tier,
    stubbedCapabilities: async () => stubbedCapabilityNames(constructed),
    clock: clock.value,
    fixtures: fixtures.value,
    sut: adapter.sut,
    sentinels: pendingCapability<Sentinels>('H3 sentinels'),
    faults: pendingCapability<Faults>('H3 fault injection and process restart'),
    static: pendingCapability<StaticScan>('H3 static provider scan', 'H3 sentinels', 'H5 email provider simulator'),
    vendors: pendingCapability<Vendors>('H5 email provider simulator'),
    config: config.value,
    teardown: async () => {
      if (tornDown) return;
      tornDown = true;
      await adapter.teardown();
      await worlds.teardown();
    },
  };
}
