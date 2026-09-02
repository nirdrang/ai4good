import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { attestationCoordinatesFromEnv, attestSlot } from './attestation.ts';
import {
  adapterDerivedCapability,
  liveFixturesCapability,
  liveSutCapability,
  pendingCapability,
  pendingMethodProxy,
  stubbedCapabilityNames,
  witnessedCapability,
  type Capability,
  type LiveAttestation,
} from './capabilities.ts';
import { REPO_ROOT } from './check.ts';
import { ControlledClock, createAttestedRealClock } from './clock.ts';
import { createConfigRegistry, type ConfigRegistry } from './config.ts';
import type { AtHarness, Faults, Sentinels, StaticScan, Vendors } from './contracts.ts';
import { createFaults, type AdapterFaultSeam } from './faults.ts';
import { createFixtureSeed, FixtureWorldStore } from './fixtures.ts';
import { createLiveEmail, type LiveVendors } from './live-email.ts';
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

/**
 * The `sut.` prefix is COMPOSED onto a name in one place and stripped back off in one place, both in
 * this file: `buildCapabilityLedger()` builds `sut.<key>` from the keys the adapter exports, and
 * `createHarness()` takes it off again.
 *
 * A THIRD COPY OF THE LITERAL LIVES IN `capabilities.ts`, where it ADMITS names to the
 * adapter-derived route — it neither builds a name nor reads one back. That duplication is
 * acceptable because divergence here is fail-closed and instant: change the prefix in this file
 * without changing the admission check in that one, and every SUT capability is REFUSED at
 * construction on the very first run, by name.
 *
 * This is NOT the silent kind of duplication this tree warns about at `vendors.ts:17-19`. That
 * warning is about a RULE with two copies, where each can quietly answer differently and both look
 * correct on their own. This is a literal whose two copies must be EQUAL, and the moment they are
 * not, nothing runs at all.
 */
const SUT_PREFIX = 'sut.';

/**
 * Every capability this harness constructs, each carrying the verdict that classified it — from the
 * witness registered for its name, or, for the two adapter-derived families (`fixtures.worlds` and
 * every `sut.<key>`), from the route itself, which stamps stand-in and names the module URL it was
 * loaded from. No witness is consulted for those two.
 *
 * This is the diagnostic surface, and it is deliberately NOT a member of `AtHarness`. The doctrine
 * in `contracts.ts` covers everything reachable from the harness object AND the objects `open()`
 * hands a test body, so a `capabilities` member there would be a provenance diagnostic sitting in
 * front of every suite. The harness's own conformance tests import the builder below directly; a
 * suite only ever holds an `AtHarness`, and nothing the harness gives it leads here.
 */
export type CapabilityLedger = {
  readonly clock: Capability<unknown>;
  readonly config: Capability<ConfigRegistry>;
  readonly fixtures: Capability<FixtureAdapter['fixtures']>;
  readonly sentinels: Capability<Sentinels>;
  readonly faults: Capability<Faults>;
  readonly vendors: Capability<Vendors | LiveVendors>;
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
  // TIER-AWARE FROM HERE, and the loop path below is untouched. `registry.ts` refuses ANY ledger
  // stand-in above loop, so an integration run needs a ledger built out of live articles — the
  // passage of time, the slot's own mail catcher, and a suite adapter that talks to the slot. That
  // is what `buildLiveLedger` constructs, on positive evidence, and it never relaxes the gate.
  if (opts.tier !== 'loop') return buildLiveLedger(opts);
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
    sut,
    all: [clock, fixtures, config, sentinels, faults, vendors, ...sut],
    teardown: async () => {
      await adapter.teardown();
      await worlds.teardown();
    },
  };
}

/* --------------------------------------------------------------------- the LIVE ledger (above loop) */

/**
 * WHAT A SUITE'S LIVE ADAPTER MODULE MUST EXPORT — `_live.ts`, beside its `_fixture.ts`.
 *
 * A SEPARATE MODULE AND A SEPARATE FACTORY SIGNATURE, never a tier flag on the loop one. The loop
 * factory takes a `ControlledClock`, and above the loop tier there is no such thing to hand it: a
 * clock that could be commanded forward would not move a real GoTrue by one millisecond. So the two
 * factories take different things because they are given different worlds, and the type system says
 * so rather than a comment.
 *
 * `backedSutMethods` IS THE CLOSED ENUMERATION ruling 2 requires, one list per sut key. It is what
 * the ledger grants `real` over, and every name in it is checked to EXIST on the surface the factory
 * returned. Every method NOT in it is present and refuses at use, by name — see `pendingMethodProxy`.
 */
interface LiveAdapterModule {
  requirement: string;
  backedSutMethods: Record<string, readonly string[]>;
  createLiveAdapter(opts: {
    /** the coordinates the runner validated and this run attested — never re-derived here */
    slot: LiveSlotCoordinates;
    /** the attested live mail catcher, so the adapter and the ledger read ONE catcher, not two */
    vendors: LiveVendors;
    config: ConfigRegistry;
    worlds: FixtureWorldStore;
  }): Promise<FixtureAdapter> | FixtureAdapter;
}

/** The four strings the runner validated, plus the mail catcher the slot's own status reported. */
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
 * fixture, whose every capability is stamped stand-in — so `registry.ts`'s gate turns every one of
 * its ids declarably red, naming the stubbed capabilities. That is the honest outcome: a suite
 * nobody has made live yet is not live, and it says so per id instead of failing the whole run in a
 * way no declaration can describe.
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
  if (loaded.backedSutMethods === null || typeof loaded.backedSutMethods !== 'object') {
    throw new Error(
      `the live adapter at ${moduleUrl} exports no backedSutMethods enumeration. The ledger grants \`real\` over ` +
        `exactly the methods a live adapter says it backs, so an adapter that names none cannot be granted anything.`,
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

/**
 * The ledger above the loop tier — every entry a live article, on positive evidence.
 *
 * THE ORDER IS LOAD-BEARING. The slot attestation comes FIRST, before anything is constructed,
 * because it is what every later grant carries: no round trip, no real clock, no real mail catcher,
 * no real system under test. A run whose coordinates cannot be attested stops here rather than
 * building a ledger it would then have to refuse.
 */
async function buildLiveLedger(opts: {
  requirement: string;
  tier: Tier;
  configOverrides?: ConfigOverrides;
}): Promise<CapabilityLedger> {
  const coordinates = liveCoordinatesFromEnv();
  const { nonce } = attestationCoordinatesFromEnv();
  const attestation: LiveAttestation = await attestSlot({
    dbUrl: coordinates.dbUrl,
    nonce,
    label: `the ${opts.tier}-tier slot for req-${opts.requirement.replace(/^req-/, '')}`,
  });

  const clock = witnessedCapability('clock.controlled', createAttestedRealClock(attestation));
  const config = witnessedCapability('config.registry', createConfigRegistry(opts.configOverrides));
  const worlds = new FixtureWorldStore(createFixtureSeed());
  const liveVendors = await createLiveEmail({ catcherUrl: coordinates.mailUrl, attestation });
  const vendors = witnessedCapability('vendors.email', liveVendors);

  const live = await loadLiveAdapterModule(opts.requirement);

  if (!live) {
    /*
     * NO LIVE ADAPTER FOR THIS SUITE. Fall back to the loop fixture, which stamps every world and
     * every sut key STAND-IN on the adapter-derived route — so the gate in `registry.ts` reports
     * `CapabilityPending` naming them, per id, and every id is declarably red.
     *
     * The clock and the mail catcher stay REAL on this ledger, and that is deliberate rather than
     * an oversight: they were constructed against the attested slot and saying otherwise would be
     * a false stand-in. The names that appear in the refusal are then exactly the ones that are
     * genuinely substituted, which is what a declaration has to state.
     */
    const provider = createEmailProviderSim();
    const { adapter, moduleUrl } = await loadAdapter(opts.requirement, new ControlledClock(), worlds, config.value, {
      email: provider.port,
    });
    const fixtures = adapterDerivedCapability('fixtures.worlds', adapter.fixtures, moduleUrl);
    const sentinels = witnessedCapability('sentinels.planted', createSentinels(adapter.sentinels));
    const faults = witnessedCapability('faults.injection', createFaults(adapter.faults));
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
      sut,
      all: [clock, fixtures, config, sentinels, faults, vendors, ...sut],
      teardown: async () => {
        await adapter.teardown();
        await worlds.teardown();
      },
    };
  }

  const adapter = await live.module.createLiveAdapter({
    slot: coordinates,
    vendors: liveVendors,
    config: config.value,
    worlds,
  });
  const fixtures = liveFixturesCapability(adapter.fixtures, attestation);
  const sentinels = witnessedCapability('sentinels.planted', createSentinels(adapter.sentinels));
  const faults = witnessedCapability('faults.injection', createFaults(adapter.faults));

  // METHOD-LEVEL BACKING, one key at a time. Nothing is granted `real` by prefix: each key's verdict
  // is about ITS OWN closed enumeration, and every method outside it refuses at use by name.
  const sut: Capability<unknown>[] = Object.entries(adapter.sut).map(([key, value]) => {
    const name = `${SUT_PREFIX}${key}`;
    const backed = live.module.backedSutMethods[key];
    if (!Array.isArray(backed)) {
      throw new Error(
        `the live adapter at ${live.moduleUrl} exports a system under test at ${JSON.stringify(key)} but names no ` +
          `backed methods for it. A key with no enumeration cannot be granted anything, and leaving it unstated ` +
          `would be the one door through which a whole key gets a verdict nobody decided.`,
      );
    }
    const surface = value as Record<string, unknown>;
    return liveSutCapability(name, pendingMethodProxy(name, backed, surface), backed, surface, attestation);
  });

  const enumeratedButAbsent = Object.keys(live.module.backedSutMethods).filter((key) => !(key in adapter.sut));
  if (enumeratedButAbsent.length) {
    throw new Error(
      `the live adapter at ${live.moduleUrl} enumerates backed methods for ${enumeratedButAbsent.join(', ')}, which ` +
        `it does not export under \`sut\`. An enumeration for a key that is not there is a claim about nothing.`,
    );
  }

  return {
    clock,
    config,
    fixtures,
    sentinels,
    faults,
    vendors,
    sut,
    all: [clock, fixtures, config, sentinels, faults, vendors, ...sut],
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
    /*
     * TWO RELABELLINGS, AND EXACTLY WHAT EACH ONE STILL TAKES ON TRUST.
     *
     * `AtHarness` describes the LOOP tier's shapes, because that is the tier every existing suite is
     * written against and widening the shared type would let a loop body reach for a member only the
     * integration tier supplies. Above loop the ledger really holds an `AttestedRealClock` (no
     * control seam) and a live mail catcher (no arming methods) — both NARROWER than what this type
     * names, which is why the assignment needs saying out loud rather than being silently allowed.
     *
     * NOTHING IS WIDENED BY IT. `registry.ts` hands a body `TierHarness<T>`, which SUBTRACTS the two
     * members at integration, so an integration body that reaches for `advance` or `rejectNext`
     * fails to compile. What the cast buys is one shared factory instead of two, and what it costs
     * is that this one line is the place the two tiers' shapes are reconciled — so it is the line to
     * read when they disagree.
     */
    clock: ledger.clock.value as AtHarness['clock'],
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
    vendors: ledger.vendors.value as AtHarness['vendors'],
    config: ledger.config.value,
    teardown: async () => {
      if (tornDown) return;
      tornDown = true;
      await ledger.teardown();
    },
  };
}
