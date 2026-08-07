import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  adapterDerivedCapability,
  pendingCapability,
  stubbedCapabilityNames,
  witnessedCapability,
  type Capability,
} from './capabilities.ts';
import { REPO_ROOT } from './check.ts';
import { ControlledClock } from './clock.ts';
import { createConfigRegistry, type ConfigRegistry } from './config.ts';
import type { AtHarness, Faults, SemanticOracle, Sentinels, StaticScan, Vendors } from './contracts.ts';
import { createFaults, type AdapterFaultSeam } from './faults.ts';
import { createFixtureSeed, FixtureWorldStore } from './fixtures.ts';
import { createOracleCapability } from './oracles.ts';
import { createSentinels, type AdapterSentinelSeam } from './sentinels.ts';
import { createEmailProviderSim, type EmailProviderPort } from './vendors.ts';
import type { ConfigOverrides, Tier } from './registry.ts';

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

/**
 * The URL comes back WITH the adapter, because it is the evidence `fixtures.worlds` and every
 * `sut.<key>` are registered on: their provenance is "this came out of the fixture adapter at
 * <path>", and the reason on the ledger has to name the module really imported. It was computed
 * here and discarded before; nothing else about the load changes.
 */
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

/** The `sut.` prefix is written once, here, and read back once, in `createHarness()`. */
const SUT_PREFIX = 'sut.';

/**
 * Every capability this harness constructs, each carrying the verdict its witness reached.
 *
 * This is the diagnostic surface, and it is deliberately NOT a member of `AtHarness`. The doctrine
 * in `contracts.ts` covers everything reachable from the harness object AND the objects `open()`
 * hands a test body, so a `capabilities` member there would be a provenance diagnostic sitting in
 * front of every suite. The harness's own conformance tests import the builder below directly; a
 * suite only ever holds an `AtHarness`, and nothing the harness gives it leads here.
 */
export type CapabilityLedger = {
  readonly clock: Capability<ControlledClock>;
  readonly config: Capability<ConfigRegistry>;
  readonly fixtures: Capability<FixtureAdapter['fixtures']>;
  readonly sentinels: Capability<Sentinels>;
  readonly faults: Capability<Faults>;
  readonly vendors: Capability<Vendors>;
  readonly oracles: Capability<SemanticOracle>;
  /** one entry per key the fixture adapter exports under `sut`, named `sut.<key>` */
  readonly sut: readonly Capability<unknown>[];
  /** every entry above, in construction order — what `stubbedCapabilities()` reads */
  readonly all: readonly Capability<unknown>[];
  teardown(): Promise<void>;
};

/**
 * Builds the ledger, and with it every capability the harness owns.
 *
 * NOTHING HERE NAMES A PROVENANCE. Each construction either hands its value to the witness
 * registered for that name, or — for the two adapter-derived families — carries the module URL the
 * loader really imported. A value no witness can classify throws out of this function instead of
 * arriving on the ledger as `real`, and a name nobody has decided about throws too.
 */
export async function buildCapabilityLedger(opts: {
  requirement: string;
  tier: Tier;
  configOverrides?: ConfigOverrides;
}): Promise<CapabilityLedger> {
  const clock = witnessedCapability('clock.controlled', new ControlledClock());
  const worlds = new FixtureWorldStore(createFixtureSeed());
  const config = witnessedCapability('config.registry', createConfigRegistry(opts.configOverrides));
  // BUILT BEFORE THE ADAPTER, because the adapter is handed the sending half of it. One sim per
  // harness, so the forced-outcome queue and the accepted-identity set cannot survive into the next
  // test — `registry.ts` opens a fresh harness per `open()` and tears it down per id.
  const provider = createEmailProviderSim();
  const { adapter, moduleUrl } = await loadAdapter(opts.requirement, clock.value, worlds, config.value, {
    email: provider.port,
  });
  const fixtures = adapterDerivedCapability('fixtures.worlds', adapter.fixtures, moduleUrl);
  const sentinels = witnessedCapability('sentinels.planted', createSentinels(adapter.sentinels));
  const faults = witnessedCapability('faults.injection', createFaults(adapter.faults));
  const vendors: Capability<Vendors> = witnessedCapability('vendors.email', { email: provider.sim });
  // The vote count comes from the at-config registry through `config.value`, which is why this is
  // built after it. An override naming an unusable count fails HERE rather than at whichever test
  // first judged something. `oracles.ts` hands the constructor the tier and the transport's kind
  // brand — the two facts no witness could read off the oracle object itself.
  const oracles = createOracleCapability({ tier: opts.tier, config: config.value });
  // NOTHING LOOKS A SUT NAME UP. This is the only thing that ever constructs one, and it registers
  // whatever keys the adapter exports, on the adapter-derived route — so there is no table entry to
  // omit and no name to mistype into existence. The runner's disposable black-box adapters export
  // `sut: { probe }` and need no special case at all.
  const sut: Capability<unknown>[] = Object.entries(adapter.sut).map(([key, value]) =>
    adapterDerivedCapability(`${SUT_PREFIX}${key}`, value, moduleUrl),
  );

  return {
    clock,
    config,
    fixtures,
    sentinels,
    faults,
    vendors,
    oracles,
    sut,
    all: [clock, fixtures, config, sentinels, faults, vendors, oracles, ...sut],
    teardown: async () => {
      await adapter.teardown();
      await worlds.teardown();
    },
  };
}

/**
 * The return type is annotated, not inferred, and that annotation is load-bearing: it is what makes
 * the shared contract a checked promise rather than a hopeful one. Inferred, this factory produced
 * `object` for every pending seam — `pendingCapability<T extends object>()` has no inference site,
 * so `T` fell back to its constraint — and the result was not assignable to `AtHarness` at all.
 * With the annotation, dropping or misnaming a contract member is a compile error here, where it is
 * written, instead of a surprise in whichever suite reaches for it.
 *
 * EVERY MEMBER BELOW IS DERIVED FROM THE LEDGER ENTRY THAT WAS JUDGED, one expression each, and
 * that is structural rather than cosmetic: it is what makes the object a witness inspected the SAME
 * object the suite is handed. They happened to be the same object before and nothing enforced it,
 * so an edit could have witnessed a stripped facade while returning the working clock — the ledger
 * describing one thing, every behaviour test driving another, and both green.
 */
export async function createHarness(opts: {
  requirement: string;
  tier: Tier;
  configOverrides?: ConfigOverrides;
}): Promise<AtHarness> {
  const ledger = await buildCapabilityLedger(opts);

  let tornDown = false;
  return {
    tier: opts.tier,
    stubbedCapabilities: async () => stubbedCapabilityNames(ledger.all),
    clock: ledger.clock.value,
    fixtures: ledger.fixtures.value,
    sut: Object.fromEntries(ledger.sut.map((entry) => [entry.name.slice(SUT_PREFIX.length), entry.value] as const)),
    sentinels: ledger.sentinels.value,
    faults: ledger.faults.value,
    // 'H3 sentinels' went from this list in the change that made planting work, and
    // 'H5 email provider simulator' goes in the change that builds the simulator above. The seam
    // names the whole missing set so its first throw reports all of it at once; the moment one of
    // them lands, keeping its name here is a declared fact that has drifted from a real one.
    // `AT-016.01` stays red — `providerClientImporters()` is what throws — but the reason it is red
    // changed, and `tests/at/expected/req-016.json` states the same one name for the same reason.
    static: pendingCapability<StaticScan>('H3 static provider scan'),
    vendors: ledger.vendors.value,
    oracles: ledger.oracles.value,
    config: ledger.config.value,
    teardown: async () => {
      if (tornDown) return;
      tornDown = true;
      await ledger.teardown();
    },
  };
}
