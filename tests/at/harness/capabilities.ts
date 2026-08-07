/**
 * PROVENANCE IS A VERDICT THIS FILE COMPUTES, NEVER A WORD A CALLER WRITES.
 *
 * There used to be two factories here, one named after each provenance, and a capability's label
 * was simply the one you called. Flipping the five stand-in call sites in `index.ts` to the other
 * factory emptied the stand-in ledger, and `registry.ts` — which refuses ANY stubbed capability
 * above the loop tier — then had nothing to refuse. A one-word edit that reads like a routine
 * promotion turned the closing gate green against a reference adapter.
 *
 * So a capability is now built by ONE constructor that takes a name, a value, and any evidence the
 * caller holds that a witness cannot derive. A witness registered for that name returns a verdict —
 * or throws. There are THREE outcomes, and the third one is the whole point:
 *
 *   stand-in  — the witness found the seam that makes this a substitute, and says which seam.
 *   real      — the witness has positive grounds, and says what they are.
 *   REFUSAL   — the witness cannot classify the value, so it refuses to classify it.
 *
 * "I found no stand-in seam" is NEVER evidence of real backing. A `clock.controlled` value with its
 * `advance` stripped is unclassifiable, not real; classifying it real would be the deleted
 * real-labelling factory reached through a different door — exactly the door this file exists to
 * close.
 *
 * The same rule covers the name itself: a capability name no witness has been registered for is an
 * error at construction, naming the name. Not defaulted to real, and not quietly defaulted to
 * stand-in either. `index.ts` and `registry.ts` have both written the reason down already — a guard
 * that switches itself off when an entry is absent is the hole again, arriving through the door
 * marked convenience.
 */

const CAPABILITY = Symbol('at-capability');

export type CapabilityProvenance = 'real' | 'stand-in';

/** A witness returns one of these, or it throws. There is no `null` and there is no default. */
export type CapabilityVerdict =
  | { readonly kind: 'stand-in'; readonly reason: string }
  | { readonly kind: 'real'; readonly evidence: string };

/**
 * The one place a caller contributes anything, and it is deliberately narrow: facts a witness
 * cannot derive from the value in front of it. Only `oracles.judge` needs any of it — the running
 * tier and the judge transport's `kind` brand, both of which `oracles.ts` already guards and
 * refuses in both mismatched directions before it ever gets here.
 */
export type CapabilityEvidence = {
  readonly tier?: string;
  readonly transport?: string;
};

export interface Capability<T> {
  readonly [CAPABILITY]: true;
  readonly name: string;
  readonly provenance: CapabilityProvenance;
  /** the witness's own words, non-null EXACTLY when `provenance` is 'stand-in' */
  readonly standInReason: string | null;
  /** the witness's own words, non-null EXACTLY when `provenance` is 'real' */
  readonly realEvidence: string | null;
  readonly value: T;
}

type CapabilityWitness = (value: unknown, evidence: CapabilityEvidence) => CapabilityVerdict;

/**
 * CALLABILITY THROUGH THE PROTOTYPE CHAIN, never own-property presence. `ControlledClock` is a
 * class and `advance` is a method on its prototype, so `Object.hasOwn(clock, 'advance')` is FALSE
 * for the very object the harness builds — an own-property witness would refuse today's clock on
 * its first run. Plain property access walks the chain; `typeof` is what asks the real question,
 * which is whether the seam can be CALLED.
 */
function callable(value: unknown, ...path: readonly string[]): boolean {
  let cursor: unknown = value;
  for (const step of path) {
    if (cursor === null || (typeof cursor !== 'object' && typeof cursor !== 'function')) return false;
    cursor = (cursor as Record<string, unknown>)[step];
  }
  return typeof cursor === 'function';
}

const REFUSAL_DOCTRINE =
  'Finding no stand-in seam is not evidence of real backing — a witness that cannot classify a value refuses it.';

/**
 * THE THREE NAME-SCOPED DECLARATIONS, said plainly instead of dressed up as checks.
 *
 * `config.registry`, `sentinels.planted` and `faults.injection` inspect nothing about their value,
 * and that is honest rather than lazy: the thing each of them would be a stand-in FOR does not
 * exist anywhere else. `atconfig.ts` IS the registry of pinned values; the marker store IS the
 * article; the fault router IS the article. `stubbedCapabilities()` reports what the HARNESS
 * substituted, and nothing here is substituted — marking them stand-in would tell an
 * integration-tier run the gate is grading a substitute, which is a lie in the other direction, and
 * would bar this identical machinery from the tier that is the closing gate.
 *
 * Writing them as a shape test would make them look like measurements. They are decisions about a
 * name, they are scoped to that name, and a reader is entitled to know which of the two they are.
 */
function theArticleItself(what: string): CapabilityWitness {
  return () => ({
    kind: 'real',
    evidence: `${what} — the article itself, so there is nothing here for it to be a substitute for`,
  });
}

/**
 * THE LEGAL BRANDS ON EACH AXIS OF THE ORACLE'S EVIDENCE, ENUMERATED AT RUNTIME.
 *
 * The oracle witness used to accept BY ABSENCE on both axes: anything that was not `loop` counted
 * as above loop, and anything that was not `replay-fs` counted as a transport worth a `real`
 * verdict. That is "I found no forbidden thing, therefore the thing is present" — the sentence this
 * file's own header forbids, on the only witness here whose `real` verdict is DERIVED. The three
 * `theArticleItself` rows return `real` too, and on every run, but unconditionally and from a
 * decision about the name; this is the one witness that reaches `real` by reasoning about evidence,
 * so it is the only place that reasoning can be wrong. A
 * `{ tier: 'integration', transport: 'bogus' }` construction came back `real` with confident-sounding
 * evidence for a brand nobody had ever heard of.
 *
 * SOURCE OF TRUTH FOR EACH LIST, so a future divergence is findable:
 *   tiers      — `Tier` in `registry.ts`
 *   transports — `TransportKind` in `oracles.ts`
 *
 * These are deliberately NOT imported as types. `oracles.ts` imports this file, so importing back
 * would add a cycle — and a compile-time union cannot constrain a runtime string anyway, which is
 * the whole reason this check has to exist at all: `CapabilityEvidence.tier` and `.transport` are
 * plain `string`, because the evidence arrives from a caller.
 */
const LEGAL_TIERS: readonly string[] = ['loop', 'integration', 'drill'];
const LEGAL_TRANSPORTS: readonly string[] = ['replay-fs', 'live', 'fake'];

/**
 * THE TABLE IS CLOSED: six exact names, no prefixes and no wildcards.
 *
 * A prefix rule (`sut.*` had one) means nobody ever decided about the names it swallows, which is
 * an unlimited namespace inside a table whose whole claim is that it is closed. The two families
 * that used to need one — `fixtures.worlds` and every `sut.<key>` — are off this table entirely and
 * built through `adapterDerivedCapability()` below, so nothing looks a SUT name up and there is no
 * typo surface left to guard.
 */
const WITNESSES = new Map<string, CapabilityWitness>([
  [
    'clock.controlled',
    (value) => {
      // The harness's `Clock` contract IS the control seam: freezeAt + advance. A capability that
      // can be COMMANDED to jump forward is not the passage of time.
      if (callable(value, 'freezeAt') && callable(value, 'advance')) {
        return {
          kind: 'stand-in',
          reason:
            'the value exposes the Clock control seam (freezeAt/advance) — time that can be commanded to jump ' +
            'forward is not the passage of time',
        };
      }
      throw new Error(
        'refusing to construct capability "clock.controlled": its value exposes no callable Clock control seam ' +
          `(freezeAt/advance), and this tree holds no attested real clock backing to record in its place. ${REFUSAL_DOCTRINE}`,
      );
    },
  ],
  [
    'vendors.email',
    (value) => {
      // ONE LEVEL DOWN: the registered value is the `Vendors` wrapper `{ email: <sim> }`, so the
      // seam to read is `email.rejectNext` / `email.attempts`, never `rejectNext` on the wrapper.
      // A provider that can be told to reject the next N sends, and that hands back every attempt
      // that reached its seam, is a simulator.
      if (callable(value, 'email', 'rejectNext') && callable(value, 'email', 'attempts')) {
        return {
          kind: 'stand-in',
          reason:
            'the value exposes the EmailProviderSim control seam (email.rejectNext/email.attempts) — a provider ' +
            'that can be told to reject the next N sends, and that hands back every attempt, is a simulator',
        };
      }
      throw new Error(
        'refusing to construct capability "vendors.email": its value exposes no callable EmailProviderSim control ' +
          `seam (email.rejectNext/email.attempts), and this tree holds no attested real provider to record in its ` +
          `place. ${REFUSAL_DOCTRINE}`,
      );
    },
  ],
  ['config.registry', theArticleItself('atconfig.ts IS the registry of pinned values')],
  ['sentinels.planted', theArticleItself('the marker store IS the planting machinery')],
  ['faults.injection', theArticleItself('the fault router IS the injection machinery')],
  [
    'oracles.judge',
    // DERIVED FROM THE TIER AND THE TRANSPORT BRAND, which is where this doctrine was already
    // working one layer down before it was carried up here. `oracles.ts` refuses both mismatched
    // combinations at the point it builds the transport; this witness reaches the same judgement
    // from the evidence handed over, and refuses the same two combinations rather than trusting
    // that the caller already did.
    (_value, evidence) => {
      const { tier, transport } = evidence;
      if (tier === undefined || transport === undefined) {
        throw new Error(
          'refusing to construct capability "oracles.judge": its provenance is derived from the running tier and ' +
            'the judge transport\'s kind brand, and this construction supplied ' +
            `${tier === undefined ? 'no tier' : `tier ${JSON.stringify(tier)}`} and ` +
            `${transport === undefined ? 'no transport kind' : `transport ${JSON.stringify(transport)}`}. ` +
            `${REFUSAL_DOCTRINE}`,
        );
      }
      // ENUMERATE BEFORE ANY RULE IS APPLIED. Every rule below reads a brand it recognises; a value
      // neither list contains is unclassifiable, and unclassifiable refuses rather than falling
      // through to whichever branch happens to catch it.
      if (!LEGAL_TIERS.includes(tier)) {
        throw new Error(
          `refusing to construct capability "oracles.judge": the TIER axis was given ${JSON.stringify(tier)}, which is ` +
            `not a brand this witness recognises. The legal tiers are ${LEGAL_TIERS.join(', ')}. ${REFUSAL_DOCTRINE}`,
        );
      }
      if (!LEGAL_TRANSPORTS.includes(transport)) {
        throw new Error(
          `refusing to construct capability "oracles.judge": the TRANSPORT axis was given ${JSON.stringify(transport)}, ` +
            `which is not a brand this witness recognises. The legal transports are ${LEGAL_TRANSPORTS.join(', ')}. ` +
            `${REFUSAL_DOCTRINE}`,
        );
      }
      if (tier === 'loop') {
        if (transport === 'live') {
          throw new Error(
            'refusing to construct capability "oracles.judge": a loop-tier oracle on a live transport would report ' +
              "today's answer under yesterday's expectations while the ledger still called it a stand-in.",
          );
        }
        return {
          kind: 'stand-in',
          reason: `the loop tier judges through a ${transport} transport rather than the live judge`,
        };
      }
      if (transport === 'replay-fs') {
        throw new Error(
          `refusing to construct capability "oracles.judge": a ${tier}-tier oracle on a filesystem replay transport ` +
            'would be a real capability answering from committed bytes while reporting that it stubbed nothing.',
        );
      }
      return {
        kind: 'real',
        evidence: `the ${tier} tier judges through a ${transport} transport, and no filesystem replay is permitted here`,
      };
    },
  ],
]);

function sealed<T>(name: string, verdict: CapabilityVerdict, value: T): Capability<T> {
  return Object.freeze({
    [CAPABILITY]: true as const,
    name,
    provenance: verdict.kind,
    standInReason: verdict.kind === 'stand-in' ? verdict.reason : null,
    realEvidence: verdict.kind === 'real' ? verdict.evidence : null,
    value,
  });
}

/**
 * The one constructor. The verdict comes from the witness registered for `name`; an unregistered
 * name is refused, and a witness that cannot classify the value throws through this call.
 */
export function witnessedCapability<T>(name: string, value: T, evidence: CapabilityEvidence = {}): Capability<T> {
  if (!name.trim()) throw new Error('a capability requires a non-empty name');
  const witness = WITNESSES.get(name);
  if (witness === undefined) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)}: no witness is registered for that name. The ` +
        `witness table is CLOSED — ${[...WITNESSES.keys()].sort().join(', ')} — so a name nobody has decided ` +
        `about is an error here rather than a default in either direction.`,
    );
  }
  return sealed(name, witness(value, evidence), value);
}

/**
 * THE NAMES THIS ROUTE MAY BUILD: `fixtures.worlds` exactly, and every `sut.<key>`.
 *
 * `index.ts` composes the SUT names — `Object.entries(adapter.sut)` behind its own `sut.` literal —
 * and strips the same prefix back off in `createHarness()`. This copy of the literal is the
 * ADMISSION CHECK for the route, not a second place the name is built, and the two must stay in
 * step: a change to the prefix there without a change here would refuse every SUT capability at
 * construction, loudly and on the first run.
 */
const ADAPTER_DERIVED_EXACT = 'fixtures.worlds';
const ADAPTER_DERIVED_PREFIX = 'sut.';

/**
 * THE ADAPTER-DERIVED ROUTE, for the two families whose provenance comes from where the module was
 * loaded rather than from anything about the value: `fixtures.worlds` and every `sut.<key>`.
 *
 * It returns stand-in UNCONDITIONALLY, and that is deliberate. `adapterUrl()` in `index.ts` has
 * exactly one possible output today, so a route that BRANCHED on the URL would be a constant
 * dressed as a check — the same dishonesty this file exists to remove. The URL is the CONTENT of
 * the reason, so the ledger names the module really imported; it is not the condition of a test.
 *
 * ON THE URL, STATED AS IT ACTUALLY IS. Through the one route the harness uses, it is loader-derived:
 * `loadAdapter()` computes it from REPO_ROOT plus the requirement and hands it back, and no caller
 * passes a path in. THE SIGNATURE DOES NOT ENFORCE THAT — this parameter is a plain string and any
 * caller may supply any non-empty one. What bounds it is that every outcome here is stand-in: a
 * fabricated URL ADDS a name to the ledger `registry.ts` refuses above loop, so it can only make the
 * closing gate stricter. The failure direction is a false RED, never a false green.
 *
 * THE TWO ROUTES PARTITION THE NAMESPACE, and the check below is what makes that true rather than
 * merely intended. Before it, `adapterDerivedCapability('clock.controlled', strippedClock, url)`
 * minted a stand-in for a name the closed witness table would have REFUSED — routing around the
 * table through a door the table does not watch. So this route refuses any name the table knows, and
 * refuses any name outside its own two families.
 *
 * THIS IS NOT THE PREFIX RULE THAT WAS REMOVED FROM THE WITNESS TABLE, and the difference is the
 * whole justification. There, a `sut.*` prefix matched a name into a table that GRANTS A VERDICT, so
 * a verdict was handed to a name nobody had decided about — an unlimited namespace inside a table
 * whose claim was that it was closed. Here the verdict is unconditional stand-in whatever the name
 * is, so matching the prefix grants nothing at all; it only restricts WHICH NAMES MAY USE THIS
 * ROUTE. A prefix that decides an outcome is a hole; a prefix that decides admission is a partition.
 */
export function adapterDerivedCapability<T>(name: string, value: T, moduleUrl: string): Capability<T> {
  if (!name.trim()) throw new Error('a capability requires a non-empty name');
  if (WITNESSES.has(name)) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)} on the adapter-derived route: a witness is registered ` +
        'for that name, and this route would stamp it stand-in without ever asking that witness — including for a ' +
        'value the witness would have REFUSED. The two routes partition the capability namespace; they do not overlap.',
    );
  }
  if (name !== ADAPTER_DERIVED_EXACT && !(name.startsWith(ADAPTER_DERIVED_PREFIX) && name.length > ADAPTER_DERIVED_PREFIX.length)) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)} on the adapter-derived route: this route builds ` +
        `${ADAPTER_DERIVED_EXACT} and every ${ADAPTER_DERIVED_PREFIX}<key> the fixture adapter exports, and nothing ` +
        'else. A name outside both families belongs on the witness table, where something decides about it.',
    );
  }
  if (!moduleUrl.trim()) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)} on the adapter-derived route with no module URL: ` +
        'the URL is the whole content of the reason, so an empty one would put a stand-in on the ledger that ' +
        'cannot say which module it came from.',
    );
  }
  return sealed(name, { kind: 'stand-in', reason: `loaded from the fixture adapter at ${moduleUrl}` }, value);
}

export function stubbedCapabilityNames(capabilities: readonly Capability<unknown>[]): string[] {
  return capabilities
    .filter((entry) => entry[CAPABILITY] === true && entry.provenance === 'stand-in')
    .map((entry) => entry.name)
    .sort();
}

export class CapabilityPending extends Error {
  constructor(readonly capabilities: readonly string[]) {
    super(`CAPABILITY PENDING — ${capabilities.join(', ')}`);
    this.name = 'CapabilityPending';
  }
}

/** A typed seam for later slices. Any attempted use fails with the capability names, never a no-op. */
export function pendingCapability<T extends object>(...capabilities: string[]): T {
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
