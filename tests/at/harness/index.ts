import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { pendingCapability, realCapability, standInCapability, stubbedCapabilityNames, type Capability } from './capabilities.ts';
import { REPO_ROOT } from './check.ts';
import { ControlledClock } from './clock.ts';
import { createConfigRegistry, type ConfigRegistry } from './config.ts';
import { createFixtureSeed, FixtureWorldStore } from './fixtures.ts';
import type { ConfigOverrides, Tier } from './registry.ts';

interface FixtureAdapter {
  fixtures: { world(name: string): Promise<{ teardown(): Promise<void> }> };
  sut: Record<string, unknown>;
  teardown(): Promise<void>;
}

interface FixtureAdapterModule {
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
  return module.createFixtureAdapter({ clock, worlds, config });
}

export async function createHarness(opts: { requirement: string; tier: Tier; configOverrides?: ConfigOverrides }) {
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
    sentinels: pendingCapability('H3 sentinels'),
    faults: pendingCapability('H3 fault injection and process restart'),
    static: pendingCapability('H3 static provider scan', 'H3 sentinels', 'H5 email provider simulator'),
    vendors: pendingCapability('H5 email provider simulator'),
    config: config.value,
    teardown: async () => {
      if (tornDown) return;
      tornDown = true;
      await adapter.teardown();
      await worlds.teardown();
    },
  };
}
