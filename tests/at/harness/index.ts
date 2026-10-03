import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT } from './check.ts';
import { ControlledClock, RealClock } from './clock.ts';
import { createConfigRegistry, type ConfigRegistry } from './config.ts';
import type { AtHarness, StaticScan } from './contracts.ts';
import { createFaults, type AdapterFaultSeam } from './faults.ts';
import { createFixtureSeed, FixtureWorldStore } from './fixtures.ts';
import { stackFromEnv, type Stack } from './live-stack.ts';
import { CapabilityPending } from './pending.ts';
import { type ConfigOverrides, type Tier } from './registry.ts';
import { createSentinels, type AdapterSentinelSeam } from './sentinels.ts';
import { createEmailProviderSim, createAnthropicMessagesSim, type AnthropicMessagesPort, type EmailProviderPort } from './vendors.ts';

interface FixtureAdapter {
  fixtures: { world(name: string): Promise<{ teardown(): Promise<void> }> };
  sut: Record<string, unknown>;
  faults?: AdapterFaultSeam;
  sentinels?: AdapterSentinelSeam;
  teardown(): Promise<void>;
}

interface FixtureAdapterModule {
  requirement: string;
  createFixtureAdapter(opts: {
    clock: ControlledClock;
    worlds: FixtureWorldStore;
    config: ConfigRegistry;
    vendors: { email: EmailProviderPort; anthropic: AnthropicMessagesPort };
  }): Promise<FixtureAdapter> | FixtureAdapter;
}

function adapterUrl(requirement: string): string {
  return pathToFileURL(join(REPO_ROOT, 'tests', 'at', 'suites', requirement, '_fixture.ts')).href;
}

async function loadAdapter(
  requirement: string,
  clock: ControlledClock,
  worlds: FixtureWorldStore,
  config: ConfigRegistry,
  vendors: { email: EmailProviderPort; anthropic: AnthropicMessagesPort },
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

interface LiveAdapterModule {
  requirement: string;
  createLiveAdapter(opts: {
    stack: Stack;
  }): Promise<FixtureAdapter> | FixtureAdapter;
}

function liveAdapterUrl(requirement: string): string {
  return pathToFileURL(join(REPO_ROOT, 'tests', 'at', 'suites', requirement, '_live.ts')).href;
}

/** File presence of `_live.ts`. `openWorld` asks this before `createHarness` is called. */
export function liveAdapterExists(requirement: string): boolean {
  return existsSync(join(REPO_ROOT, 'tests', 'at', 'suites', requirement, '_live.ts'));
}

async function loadLiveAdapterModule(requirement: string): Promise<{ module: LiveAdapterModule; moduleUrl: string } | null> {
  const moduleUrl = liveAdapterUrl(requirement);
  if (!liveAdapterExists(requirement)) return null;

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
  if (loaded.requirement !== requirement) {
    throw new Error(
      `the live adapter at ${moduleUrl} declares requirement ` +
        `${loaded.requirement === undefined ? '<nothing: it exports no `requirement`>' : JSON.stringify(loaded.requirement)} ` +
        `but was loaded as ${JSON.stringify(requirement)}.`,
    );
  }
  return { module: loaded as LiveAdapterModule, moduleUrl };
}

/** Any read throws `CapabilityPending` naming the members; the seam never answers. */
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
  }): AtHarness => {
    let tornDown = false;
    return {
      tier: opts.tier,
      clock: parts.clock,
      fixtures: parts.adapter.fixtures,
      sut: parts.adapter.sut,
      sentinels: createSentinels(parts.adapter.sentinels),
      faults: createFaults(parts.adapter.faults),
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
    const anthropic = createAnthropicMessagesSim();
    const { adapter } = await loadAdapter(opts.requirement, clock, worlds, config, { email: provider.port, anthropic: anthropic.port });
    return finish({ clock, adapter, vendors: { email: provider.sim, anthropic: anthropic.sim } });
  }

  const live = await loadLiveAdapterModule(opts.requirement);
  if (!live) {
    throw new Error(
      `no live adapter for ${opts.requirement}; the registry refuses this tier before construction`,
    );
  }

  const adapter = await live.module.createLiveAdapter({ stack: stackFromEnv() });
  return finish({
    clock: new RealClock() as unknown as AtHarness['clock'],
    adapter,
    vendors: { email: refusing('vendors.email'), anthropic: refusing('vendors.anthropic') },
  });
}
