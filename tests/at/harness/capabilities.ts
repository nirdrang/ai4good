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
 * cannot derive from the value in front of it. No live witness needs any of it — the judge that
 * did is parked.
 */
export type CapabilityEvidence = {
  readonly tier?: string;
  readonly transport?: string;
};

/* ------------------------------------------------------------------ the live attestation brand */

/**
 * POSITIVE GROUNDS ARE A ROUND TRIP THAT HAPPENED, NEVER A SHAPE THAT LOOKS RIGHT.
 *
 * `localStackProblems()` in `runner.ts` checks that a URL points at the loopback address on the
 * slot's port and that a key decodes as a local development JWT. Every one of those is fabricable by
 * a caller with a text editor and no database answering anywhere — they GUARD the founder's personal
 * stack, which is what they were written for, and they establish nothing positive at all. A witness
 * that read them as grounds would grant `real` to four plausible strings.
 *
 * So a live capability carries an ATTESTATION: an object the harness's own live constructors stamp
 * onto the value AFTER a round trip that could only have succeeded against the prepared slot. The
 * round trip is `attestation.ts`'s — `prepare()` mints a nonce, writes it into the slot database
 * after the reset, and the child reads it back THROUGH the coordinates it was handed. "These
 * coordinates answered with this run's runner-minted value" is the grounds; nothing weaker is.
 *
 * WHAT THIS FILE CAN AND CANNOT CHECK, said exactly, because a closure claim wider than the truth is
 * the defect this file exists to remove. It has no I/O and performs no round trip. It checks that a
 * value carries a well-formed attestation stamped FOR THAT CAPABILITY NAME, with non-empty evidence.
 * The round trip itself is `attestation.ts`'s to perform and to refuse. What that buys is the same
 * thing the two-route partition buys elsewhere: a name cannot be granted `real` through a door that
 * asks nothing, and the one door that does ask is a single, reviewed function.
 *
 * THE SYMBOL IS EXPORTED, so a determined caller can import it and stamp an object — exactly as a
 * determined caller could import any constructor. That is the same line `suite-adapters.ts` draws:
 * the threat model is an honest mistake nothing can notice, not an author set on defeating the
 * design, who has to write something at least as deliberate as a cast.
 */
export const ATTESTATION = Symbol('at-live-attestation');

/**
 * The brand a SLOT attestation carries. It is stamped onto the attestation OBJECT ITSELF, so that
 * "an object with an `evidence` string on it" — which any caller can write — is not the same thing
 * as an attestation, and the live constructors below can tell the two apart with one call.
 */
export const SLOT_ATTESTATION_BRAND = 'slot';

export type LiveAttestation = {
  /** what was proved, in words a transcript can carry — never a credential */
  readonly evidence: string;
  /** WHICH capability name this attestation was minted for; a brand for another name is refused */
  readonly constructedFor: string;
};

/** Stamp an attestation onto a live value. Non-enumerable, so it never travels into a JSON dump. */
export function stampAttestation<T extends object>(value: T, attestation: LiveAttestation): T {
  if (!attestation.evidence.trim()) throw new Error('a live attestation requires non-empty evidence');
  if (!attestation.constructedFor.trim()) throw new Error('a live attestation must name the capability it was minted for');
  Object.defineProperty(value, ATTESTATION, {
    value: Object.freeze({ evidence: attestation.evidence, constructedFor: attestation.constructedFor }),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return value;
}

/** The attestation this value carries FOR THIS NAME, or null. A brand for another name is null. */
export function attestationOf(value: unknown, constructedFor: string): LiveAttestation | null {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return null;
  const carried = (value as Record<symbol, unknown>)[ATTESTATION];
  if (carried === null || typeof carried !== 'object') return null;
  const { evidence, constructedFor: brandedFor } = carried as Partial<LiveAttestation>;
  if (typeof evidence !== 'string' || evidence.trim() === '') return null;
  if (brandedFor !== constructedFor) return null;
  return { evidence, constructedFor };
}

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
 * THE TABLE IS CLOSED: five exact names, no prefixes and no wildcards.
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
      // THE BRANCH THIS WITNESS'S OWN REFUSAL TEXT ANTICIPATED. It used to end "this tree holds no
      // attested real clock backing to record in its place", which was true while nothing could
      // produce one. `createAttestedRealClock()` in `clock.ts` now can: at integration the harness
      // constructs the passage of time with NO control seam and stamps it with the slot attestation.
      // The grant is on that positive evidence and on nothing else — a seamless object with no
      // attestation still refuses, exactly as before, because "I found no stand-in seam" was never
      // evidence of real backing and is not one now.
      const attested = attestationOf(value, 'clock.controlled');
      if (attested) {
        return {
          kind: 'real',
          evidence: `an attested real clock: it exposes no control seam and cannot be commanded forward — ${attested.evidence}`,
        };
      }
      throw new Error(
        'refusing to construct capability "clock.controlled": its value exposes no callable Clock control seam ' +
          `(freezeAt/advance), and it carries no attested real clock backing to record in its place. ${REFUSAL_DOCTRINE}`,
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
      // THE LIVE BRANCH, and it is a MAIL CATCHER rather than a mail sender — which is worth being
      // exact about, because the two are not the same claim. Nothing in this repository sends mail
      // through a real provider at any tier, and no green anywhere says it does. What the slot's
      // stack really holds is the catcher every message the local Auth emits lands in, and reading
      // it is a real capability: the message under assertion was produced by GoTrue on this run, not
      // minted by a simulator the test armed. The grant is on a PROBED endpoint plus the slot
      // attestation; the sim branch above is untouched, so the loop tier's verdict is unchanged.
      // ONE LEVEL DOWN AGAIN, for the same reason the control seam is read one level down: the
      // registered value is the `{ email: … }` wrapper, which is an object literal anybody can
      // build, and the thing that was actually probed is the reader inside it.
      const attested = attestationOf((value as { email?: unknown } | null)?.email, 'vendors.email');
      if (attested) {
        return {
          kind: 'real',
          evidence:
            'an attested live mail catcher: the messages read are the ones the slot stack really ' +
            `delivered, and no send outcome can be armed from a test — ${attested.evidence}`,
        };
      }
      throw new Error(
        'refusing to construct capability "vendors.email": its value exposes no callable EmailProviderSim control ' +
          `seam (email.rejectNext/email.attempts), and it carries no attested live provider to record in its ` +
          `place. ${REFUSAL_DOCTRINE}`,
      );
    },
  ],
  ['config.registry', theArticleItself('atconfig.ts IS the registry of pinned values')],
  ['sentinels.planted', theArticleItself('the marker store IS the planting machinery')],
  ['faults.injection', theArticleItself('the fault router IS the injection machinery')],
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

/* --------------------------------------------------------------------------- the LIVE route */

/**
 * DOES THE ADAPTER REALLY WRITE THIS MEMBER — as opposed to inheriting it from every object there
 * has ever been (gate-2 ruling S1-3).
 *
 * The existence check under `liveSutCapability` used to be `typeof surface[method] === 'function'`,
 * and plain property access walks the WHOLE prototype chain. So an enumeration naming `toString`,
 * `constructor` or `hasOwnProperty` passed it, and the ledger then granted `real` over a member the
 * live adapter never wrote — a real verdict covering nothing, which is the false green in miniature.
 *
 * THE CHAIN IS WALKED, AND IT STOPS AT `Object.prototype`. Own-property-only would be too strict: an
 * adapter is free to be a class instance or to sit on an authored prototype, and its methods would
 * live one link up. What is never the adapter's own work is what every object already has, so the
 * walk stops exactly there. Today's live adapter is a plain object literal, so both readings agree on
 * it; the difference only ever shows up on a name nobody authored, which is the case this exists for.
 */
function authoredMethod(surface: Record<string, unknown>, method: string): boolean {
  for (
    let cursor: object | null = surface;
    cursor !== null && cursor !== Object.prototype;
    cursor = Object.getPrototypeOf(cursor) as object | null
  ) {
    if (Object.prototype.hasOwnProperty.call(cursor, method)) return typeof surface[method] === 'function';
  }
  return false;
}

/**
 * THE THIRD ROUTE, and it is a SEPARATE CONSTRUCTOR WITH ITS OWN ADMISSION PARTITION — deliberately,
 * mirroring the two-route design above rather than adding a branch inside either of them.
 *
 * The adapter-derived route is safe precisely because every outcome it can produce is stand-in: a
 * fabricated module URL can only ADD a name to the list `registry.ts` refuses above loop, so its
 * failure direction is a false RED. This route GRANTS `real`, so the same laxity would be a hole,
 * and the difference is written into its admission checks rather than into a comment:
 *
 *   - NOTHING IS EVER GRANTED `real` BY PREFIX. `liveSutCapability` builds `sut.<key>` for ONE key
 *     at a time and the verdict it grants is about that key's METHOD ENUMERATION, which the live
 *     adapter module exports as a closed list. A method outside the list is not real, is not
 *     stand-in, and cannot be called: `pendingMethodProxy` refuses it AT USE, by name.
 *   - EVERY ENUMERATED NAME MUST EXIST ON THE LOADED SURFACE. An enumeration naming a method the
 *     adapter does not implement would be a real grant covering a method nothing backs, which is
 *     the false green in miniature. It is refused here, at construction, naming the names.
 *   - EVERY GRANT CARRIES THE SLOT ATTESTATION. Without the round trip that proved the coordinates
 *     answered with this run's minted value, there is no positive evidence and no grant.
 *
 * WHAT A `real` VERDICT HERE MEANS, said in the narrowest true words: the value under this name was
 * built by the live adapter against a slot whose coordinates answered with this run's attestation,
 * and the enumerated methods are the ones that adapter really implements. It does not mean the
 * methods are correct, and it does not mean the un-enumerated ones are absent — they are present and
 * they refuse.
 */
export function liveSutCapability<T extends object>(
  name: string,
  value: T,
  backedMethods: readonly string[],
  surface: Record<string, unknown>,
  attestation: LiveAttestation,
): Capability<T> {
  if (!name.startsWith(ADAPTER_DERIVED_PREFIX) || name.length === ADAPTER_DERIVED_PREFIX.length) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)} on the live route: this constructor builds ` +
        `${ADAPTER_DERIVED_PREFIX}<key> names and nothing else. ${ADAPTER_DERIVED_EXACT} has its own constructor, ` +
        `and every other name belongs on the witness table, where something decides about it.`,
    );
  }
  if (WITNESSES.has(name)) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)} on the live route: a witness is registered for that ` +
        'name, and this route would grant it real without ever asking that witness. The routes partition the ' +
        'capability namespace; they do not overlap.',
    );
  }
  if (backedMethods.length === 0) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)} on the live route with an EMPTY backed-method ` +
        'enumeration: a real verdict over nothing at all would put a name on the ledger that says a live adapter ' +
        'backs it while no method is backed. A suite with nothing live has no live capability.',
    );
  }
  const duplicated = [...new Set(backedMethods.filter((method, index) => backedMethods.indexOf(method) !== index))];
  if (duplicated.length) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)}: its backed-method enumeration names ` +
        `${duplicated.join(', ')} more than once, so the enumeration is not the closed list it claims to be.`,
    );
  }
  const absent = backedMethods.filter((method) => !authoredMethod(surface, method));
  if (absent.length) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)}: its backed-method enumeration names ` +
        `${absent.join(', ')}, which the loaded live adapter does not implement as a callable member of its own ` +
        `(a member reached only through Object.prototype is not one). An enumeration is a claim about a surface, ` +
        'and a claim about a member that is not there would grant real over nothing.',
    );
  }
  const attested = attestationOf(attestation, SLOT_ATTESTATION_BRAND);
  if (!attested) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(name)} on the live route with no slot attestation: shape ` +
        'checks over a connection string are fabricable by anyone with a text editor, so the only positive grounds ' +
        'this harness accepts are "these coordinates answered with this run\'s runner-minted value".',
    );
  }
  return sealed(
    name,
    {
      kind: 'real',
      evidence:
        `backed live against the slot by the suite's live adapter over the closed enumeration ` +
        `[${[...backedMethods].sort().join(', ')}]; every other method refuses at use — ${attested.evidence}`,
    },
    value,
  );
}

/** The live route's `fixtures.worlds` half: one exact name, the same attestation requirement. */
export function liveFixturesCapability<T>(value: T, attestation: LiveAttestation): Capability<T> {
  const attested = attestationOf(attestation, SLOT_ATTESTATION_BRAND);
  if (!attested) {
    throw new Error(
      `refusing to construct capability ${JSON.stringify(ADAPTER_DERIVED_EXACT)} on the live route with no slot ` +
        'attestation: without the round trip that proved the coordinates answered with this run\'s minted value ' +
        'there are no positive grounds, and finding no stand-in seam is not evidence of real backing.',
    );
  }
  return sealed(
    ADAPTER_DERIVED_EXACT,
    { kind: 'real', evidence: `fixture worlds built against the slot's own stack — ${attested.evidence}` },
    value,
  );
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

/**
 * PROVENANCE AT METHOD GRANULARITY, because a whole suite shares one `sut.<key>`.
 *
 * REQ-001 binds exactly one system-under-test key, `accounts`, and thirty-seven acceptance ids drive
 * it. A verdict at the key level therefore says one word about thirty-seven different questions: the
 * live adapter genuinely backs a sign-in and genuinely cannot perform an OAuth consent round trip,
 * and there is no single honest label for both.
 *
 * So the key's ledger entry is `real` over a CLOSED ENUMERATION of backed method names, and every
 * method outside that enumeration is a callable proxy that THROWS `CapabilityPending` naming
 * `sut.<key>.<method>` the moment a body touches it.
 *
 * WHY THIS IS NOT A LEDGER STAND-IN, which is the distinction the whole design turns on. A stand-in
 * ANSWERS: it produces a value the test then asserts on, so a suite can go green over it, which is
 * why `registry.ts` refuses one above the loop tier. A pending proxy answers NOTHING — it fakes no
 * behaviour, returns no value and can never produce a green. Its only possible effect is to turn one
 * id red, by name, with a detail the declaration machinery can match exactly. The failure direction
 * is a false RED and never a false green, so it belongs on the permitted side of the gate.
 *
 * READ, NEVER CALLED, IS STILL A REFUSAL, and deliberately so. The trap throws from `get`, not from
 * the returned function, so `const f = sut.somethingUnbacked` is already the refusal. A body that
 * merely names an unbacked method has leaned on it, and letting the read pass would move the red to
 * whichever later line happened to invoke it — or hide it entirely behind an `if`.
 *
 * THREE PROPERTY READS ARE ANSWERED RATHER THAN REFUSED, and each is a real hazard rather than a
 * convenience: `then` (an `await` on this object probes it, and throwing there turns an unrelated
 * await into this refusal), and the two well-known symbols a runtime reaches for when it prints or
 * inspects a value. A test never asserts on any of the three.
 */
export function pendingMethodProxy<T extends object>(
  capabilityName: string,
  backedMethods: readonly string[],
  surface: Record<string, unknown>,
): T {
  const backed = new Set(backedMethods);
  return new Proxy(surface, {
    get(target, property, receiver) {
      if (typeof property === 'symbol') return Reflect.get(target, property, receiver) as unknown;
      if (property === 'then') return undefined;
      if (backed.has(property)) {
        const member = Reflect.get(target, property, receiver) as unknown;
        return typeof member === 'function' ? (member as (...args: unknown[]) => unknown).bind(target) : member;
      }
      throw new CapabilityPending([`${capabilityName}.${property}`]);
    },
    /*
     * A BODY CANNOT DISCOVER WHICH METHODS ARE BACKED AND THEN TAKE A DIFFERENT PATH.
     *
     * This trap used to be `Reflect.has(target, property)` while its own comment claimed the
     * behaviour below (gate-2 ruling S1-4). For a contract method the raw adapter OMITS entirely —
     * which is every unbacked method, because the live adapter deliberately writes none of them —
     * `'method' in sut` answered false, so a body could branch around the refusal and report a
     * green for a criterion it skipped. That is the one thing this proxy exists to prevent.
     *
     * SO EVERY STRING PROPERTY ANSWERS PRESENT, and the read then throws `CapabilityPending` naming
     * it. The failure direction stays a false RED: nothing new can be reached, one more thing
     * refuses. Symbols keep `Reflect.has`, for the same reason the `get` trap answers them — a
     * runtime probing for a well-known symbol is not a body leaning on a capability.
     */
    has(target, property) {
      if (typeof property === 'symbol') return Reflect.has(target, property);
      return true;
    },
  }) as T;
}
