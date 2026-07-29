import { pendingCapability, standInCapability, stubbedCapabilityNames, type Capability } from './capabilities.ts';
import { ControlledClock } from './clock.ts';
import { createFixtureSeed, FixtureWorldStore } from './fixtures.ts';
import type { Tier } from './registry.ts';

interface FixtureAdapter {
  fixtures: { world(name: string): Promise<{ teardown(): Promise<void> }> };
  sut: Record<string, unknown>;
  teardown(): Promise<void>;
}

interface FixtureAdapterModule {
  createFixtureAdapter(opts: { clock: ControlledClock; worlds: FixtureWorldStore }): Promise<FixtureAdapter> | FixtureAdapter;
}

async function loadAdapter(requirement: string, clock: ControlledClock, worlds: FixtureWorldStore): Promise<FixtureAdapter> {
  const moduleUrl = new URL(`../suites/${requirement}/_fixture.ts`, import.meta.url).href;
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
  return module.createFixtureAdapter({ clock, worlds });
}

export async function createHarness(opts: { requirement: string; tier: Tier }) {
  const clock = standInCapability('clock.controlled', new ControlledClock());
  const worlds = new FixtureWorldStore(createFixtureSeed());
  const adapter = await loadAdapter(opts.requirement, clock.value, worlds);
  const fixtures = standInCapability('fixtures.worlds', adapter.fixtures);
  const sutCapabilities: Capability<unknown>[] = Object.entries(adapter.sut).map(([name, value]) =>
    standInCapability(`sut.${name}`, value),
  );
  const constructed: Capability<unknown>[] = [clock, fixtures, ...sutCapabilities];

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
    config: pendingCapability('H6 at-config registry'),
    teardown: async () => {
      if (tornDown) return;
      tornDown = true;
      await adapter.teardown();
      await worlds.teardown();
    },
  };
}
