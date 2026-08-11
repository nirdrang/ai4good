/**
 * THE INTEGRATION TIER'S OWN CONFORMANCE WALL.
 *
 * `conformance.selftest.ts` proves the loop tier's provenance rules. This file proves the rules the
 * tier ABOVE loop adds, and every one of them exists because a green at that tier is the closing
 * gate: it is the tier whose meaning is "proved for real", so a lie there is the only lie that
 * matters.
 *
 * FOUR THINGS ARE UNDER TEST, and they are the four the amended plan's steps 2, 3 and 4 name:
 *
 *   1. the above-loop refusal is DECLARABLE — its text is the text a declaration rebuilds;
 *   2. `real` above loop needs the attestation ROUND TRIP, and nothing weaker gets it;
 *   3. no name is granted `real` by prefix, at either the key level or the method level;
 *   4. the loop tier is byte-identical to what it was, which is the promise every one of the other
 *      three is worth nothing without.
 *
 * NO DATABASE AND NO CONTAINER. This file runs under vitest at the loop tier, in CI. The attestation
 * read is driven through its own selftest seam, which supplies an ANSWER and never a verdict — the
 * comparison that turns an answer into evidence is the real one, in the real function.
 */

import { describe, expect, it } from 'vitest';

import { attestSlot, mintAttestationNonce, writeAttestation } from './attestation.ts';
import {
  adapterDerivedCapability,
  CapabilityPending,
  liveFixturesCapability,
  liveSutCapability,
  pendingMethodProxy,
  stampAttestation,
  stubbedCapabilityNames,
  witnessedCapability,
  type LiveAttestation,
} from './capabilities.ts';
import { AttestedRealClock, ControlledClock, createAttestedRealClock } from './clock.ts';
import { declaredDetail, detailMatches } from './expected.ts';
import { buildCapabilityLedger } from './index.ts';
import { createLiveEmail } from './live-email.ts';
import { aboveLoopStubbedRefusal, chooseTierBody, tierBodyProblem, tierTimeout } from './registry.ts';

/** One attestation, minted the way the real path mints it: through the round trip, never by hand. */
async function anAttestation(label = 'slot 1'): Promise<LiveAttestation> {
  const nonce = mintAttestationNonce();
  return attestSlot({ dbUrl: 'postgresql://postgres:postgres@127.0.0.1:55322/postgres', nonce, label, readNonce: async () => [nonce] });
}

describe('the above-loop stand-in refusal is declarable', () => {
  it('names the exact stubbed capabilities, in a shape a declaration rebuilds byte for byte', async () => {
    // THE POINT OF THIS TEST. `expected.ts` rebuilds the whole first line a `capability-pending` red
    // must produce and compares it with `===`. The refusal `openWorld` throws and the line
    // `declaredDetail` builds are two independent statements about one string, and the only way to
    // know they agree is to compare them — which is what this does. A wording change on either side
    // breaks here rather than making every integration declaration silently unmatchable.
    const refusal = aboveLoopStubbedRefusal('integration', ['fixtures.worlds', 'sut.notifications']);
    expect(refusal, 'an above-loop run with stand-ins on the ledger did not refuse').not.toBeNull();

    const reported = `${refusal!.name}: ${refusal!.message}`;
    const declared = declaredDetail('AT-016.02', {
      kind: 'capability-pending',
      capabilities: ['fixtures.worlds', 'sut.notifications'],
    });
    expect(reported, 'the refusal no longer produces the line a declaration rebuilds').toBe(declared);
    expect(
      detailMatches('AT-016.02', { kind: 'capability-pending', capabilities: ['fixtures.worlds', 'sut.notifications'] }, reported),
    ).toBe(true);
  });

  it('refuses nothing at the loop tier, and nothing when the ledger is stand-in-free', () => {
    // The rule is not "above loop, refuse". It is "above loop, refuse a STAND-IN" — and an
    // integration ledger built out of live articles has none, which is the whole reason any
    // integration green can exist at all.
    expect(aboveLoopStubbedRefusal('loop', ['clock.controlled', 'vendors.email'])).toBeNull();
    expect(aboveLoopStubbedRefusal('integration', [])).toBeNull();
  });

  it('a red declared for one set of stubbed names does not match a red carrying another', () => {
    // A free substring would let ANY capability-pending red satisfy ANY capability-pending
    // declaration. The names are part of the contract, so a suite that starts leaning on one more
    // stand-in fails its declaration rather than hiding inside it.
    const refusal = aboveLoopStubbedRefusal('integration', ['fixtures.worlds', 'sut.notifications'])!;
    const reported = `${refusal.name}: ${refusal.message}`;
    expect(detailMatches('AT-016.02', { kind: 'capability-pending', capabilities: ['fixtures.worlds'] }, reported)).toBe(false);
  });
});

describe('a callable pending proxy refuses at use, by name', () => {
  const surface = {
    signInWithEmailPassword: async () => ({ ok: true }),
    registerWithProvider: async () => ({ ok: true }),
  };

  it('hands back a backed method and refuses an unbacked one, naming sut.<key>.<method>', async () => {
    const sut = pendingMethodProxy<Record<string, () => Promise<unknown>>>(
      'sut.accounts',
      ['signInWithEmailPassword'],
      surface,
    );

    await expect(sut.signInWithEmailPassword()).resolves.toEqual({ ok: true });

    let thrown: unknown;
    try {
      void sut.registerWithProvider;
    } catch (err) {
      thrown = err;
    }
    expect(thrown, 'reading an unbacked method did not refuse').toBeInstanceOf(CapabilityPending);
    expect((thrown as CapabilityPending).capabilities).toEqual(['sut.accounts.registerWithProvider']);
  });

  it('produces a refusal a declaration can match exactly', () => {
    // Same doctrine as the ledger refusal above: an id that leans on an unbacked method is not
    // merely red, it is red in a shape the declaration machinery understands.
    const sut = pendingMethodProxy<Record<string, unknown>>('sut.accounts', [], surface);
    let thrown: CapabilityPending | null = null;
    try {
      void sut.registerWithProvider;
    } catch (err) {
      thrown = err as CapabilityPending;
    }
    const reported = `${thrown!.name}: ${thrown!.message}`;
    expect(
      detailMatches('AT-001.02', { kind: 'capability-pending', capabilities: ['sut.accounts.registerWithProvider'] }, reported),
    ).toBe(true);
  });

  it('REFUSES ON THE READ, not on the call — a body that merely names an unbacked method has leaned on it', () => {
    const sut = pendingMethodProxy<Record<string, unknown>>('sut.accounts', ['signInWithEmailPassword'], surface);
    // If the refusal lived in the returned function, this line would pass and the red would land on
    // whichever later line happened to invoke it — or nowhere at all, behind an `if`.
    expect(() => Object.getOwnPropertyDescriptor(sut, 'registerWithProvider') && sut.registerWithProvider).toThrow(CapabilityPending);
  });

  it('answers `then` and symbol reads rather than refusing them', async () => {
    // AN AWAIT PROBES `then`. Throwing there would turn an unrelated `await` on this object into
    // this refusal, which would report the wrong cause for the right failure.
    const sut = pendingMethodProxy<Record<string, unknown>>('sut.accounts', [], surface);
    await expect(Promise.resolve(sut)).resolves.toBeDefined();
    expect(() => String(Object.prototype.toString.call(sut))).not.toThrow();
  });

  it('reports an unbacked method as PRESENT, so a body cannot branch around it', () => {
    // `in` answers for the whole surface. A proxy that reported unbacked methods absent would let a
    // body detect them and take a different path — turning a refusal into a silent skip.
    const sut = pendingMethodProxy<Record<string, unknown>>('sut.accounts', ['signInWithEmailPassword'], surface);
    expect('registerWithProvider' in sut, 'an unbacked method was reported absent, which is a skippable state').toBe(true);
  });

  it('reports a method the adapter OMITS ENTIRELY as present, and refuses on the read (ruling S1-4)', () => {
    /*
     * THE CASE THE TEST ABOVE DOES NOT COVER, and the one that actually occurs. The live adapter
     * deliberately writes NO member for the methods it does not back — its own comment says why — so
     * the raw surface has no `sendDiscoveryMessage` at all. With `Reflect.has` the `in` check
     * answered FALSE for exactly those methods, which is the skippable state the proxy's own comment
     * said could not exist.
     */
    const sut = pendingMethodProxy<Record<string, unknown>>('sut.accounts', ['signInWithEmailPassword'], surface);
    expect('sendDiscoveryMessage' in sut, 'a method the adapter omits was reported absent, so a body could skip it').toBe(
      true,
    );

    let thrown: unknown;
    try {
      void sut.sendDiscoveryMessage;
    } catch (err) {
      thrown = err;
    }
    expect(thrown, 'reading an omitted method did not refuse').toBeInstanceOf(CapabilityPending);
    expect((thrown as CapabilityPending).capabilities).toEqual(['sut.accounts.sendDiscoveryMessage']);
  });

  it('keeps Reflect.has for symbols, so a runtime probe is not answered as a capability', () => {
    const sut = pendingMethodProxy<Record<string, unknown>>('sut.accounts', [], surface);
    expect(Symbol.iterator in sut, 'a well-known symbol was reported present on a surface that has none').toBe(false);
  });
});

describe('real provenance requires the attestation round trip', () => {
  it('grants when the supplied coordinates answer with THIS run\'s minted nonce', async () => {
    const attestation = await anAttestation('the integration-tier slot for req-001');
    expect(attestation.evidence).toContain("answered with this run's runner-minted attestation nonce");
  });

  it('refuses well-formed coordinates whose database holds a DIFFERENT value', async () => {
    // THE CASE THAT MOTIVATED THE WHOLE MECHANISM. A connection string can be loopback, on the
    // slot's own port, and perfectly shaped, while addressing a database this run never prepared.
    // Shape checks pass it; this does not.
    await expect(
      attestSlot({
        dbUrl: 'postgresql://postgres:postgres@127.0.0.1:55322/postgres',
        nonce: mintAttestationNonce(),
        label: 'slot 1',
        readNonce: async () => [mintAttestationNonce()],
      }),
    ).rejects.toThrow(/answered with a value that is not the one this run's runner minted/);
  });

  it('refuses coordinates nothing answers', async () => {
    await expect(
      attestSlot({
        dbUrl: 'postgresql://postgres:postgres@127.0.0.1:55322/postgres',
        nonce: mintAttestationNonce(),
        label: 'slot 1',
        readNonce: async () => {
          throw new Error('connection refused');
        },
      }),
    ).rejects.toThrow(/did not answer the attestation read/);
  });

  it('refuses when the attestation table holds anything other than exactly one row', async () => {
    // Zero rows is a database this run did not prepare. More than one is a table that accumulated
    // across runs, where a stale nonce could satisfy a later read — the exact leftover the reset is
    // supposed to have destroyed.
    const nonce = mintAttestationNonce();
    for (const rows of [[], [nonce, nonce]]) {
      await expect(
        attestSlot({ dbUrl: 'postgresql://x@127.0.0.1:55322/postgres', nonce, label: 'slot 1', readNonce: async () => rows }),
      ).rejects.toThrow(/held \d+ rows/);
    }
  });

  it('refuses a child that received no nonce at all, naming what to run instead', async () => {
    await expect(
      attestSlot({ dbUrl: 'postgresql://x@127.0.0.1:55322/postgres', nonce: '', label: 'slot 1', readNonce: async () => [] }),
    ).rejects.toThrow(/received no AT_SLOT_ATTESTATION/);
  });

  it('refuses a child that received no coordinates at all', async () => {
    await expect(attestSlot({ dbUrl: '', nonce: 'anything', label: 'slot 1' })).rejects.toThrow(/no database URL reached this child/);
  });
});

describe('the attestation WRITE demands the identity read that proved its target (ruling S1-1)', () => {
  /*
   * NOTHING IS CONNECTED TO HERE. Every refusal below is a statement before the SQL client is
   * constructed, which is the property under test: the write is refused BEFORE it opens a connection,
   * not caught while failing inside one. This is the same shape `runner.selftest.ts` uses for the
   * reset's own proof parameter, and the same doctrine — the proof travels in.
   */
  const target = { projectId: 'ai4good-slot-2' };
  const dbUrl = 'postgresql://postgres:postgres@127.0.0.1:56322/postgres';

  it('refuses a read that proves ANOTHER project', async () => {
    await expect(
      writeAttestation(target, { provenProjectId: 'ai4good-slot-1', status: { dbUrl } }, mintAttestationNonce()),
    ).rejects.toThrow(/proves ai4good-slot-1, not ai4good-slot-2/);
  });

  it('refuses a read that proved no project at all', async () => {
    await expect(
      writeAttestation(target, { provenProjectId: null, status: { dbUrl } }, mintAttestationNonce()),
    ).rejects.toThrow(/proves no project at all/);
  });

  it('refuses a read where no stack answered, so it names no database', async () => {
    await expect(
      writeAttestation(target, { provenProjectId: 'ai4good-slot-2', status: null }, mintAttestationNonce()),
    ).rejects.toThrow(/carries no stack report/);
  });
});

describe('the live mail catcher is granted on a BRAND and an IDENTIFICATION, never on a 200 (rulings S1-2, S1-6)', () => {
  const answer = (status: number, text: string) => async (): Promise<{ status: number; text: string }> => ({ status, text });

  it('refuses an attestation that carries no slot brand', async () => {
    await expect(
      createLiveEmail({
        catcherUrl: 'http://127.0.0.1:55324',
        attestation: { evidence: 'a mail catcher answered, honestly', constructedFor: 'slot' },
        readAnswer: answer(200, JSON.stringify({ Version: 'v1.30.2' })),
      }),
    ).rejects.toThrow(/carries no slot brand/);
  });

  it('refuses a 200 that is not JSON', async () => {
    await expect(
      createLiveEmail({
        catcherUrl: 'http://127.0.0.1:55324',
        attestation: await anAttestation(),
        readAnswer: answer(200, '<html><body>it works!</body></html>'),
      }),
    ).rejects.toThrow(/not JSON/);
  });

  it('refuses a 200 of JSON that carries no string Version — the field a Mailpit identifies itself with', async () => {
    for (const body of ['{}', JSON.stringify({ Version: 42 }), JSON.stringify({ Version: '  ' }), JSON.stringify({ version: 'v1' })]) {
      await expect(
        createLiveEmail({
          catcherUrl: 'http://127.0.0.1:55324',
          attestation: await anAttestation(),
          readAnswer: answer(200, body),
        }),
      ).rejects.toThrow(/carries no string `Version`/);
    }
  });

  it('grants on the Mailpit identification shape, and says which catcher it measured', async () => {
    const vendors = await createLiveEmail({
      catcherUrl: 'http://127.0.0.1:55324/',
      attestation: await anAttestation(),
      readAnswer: answer(200, JSON.stringify({ Version: 'v1.30.2' })),
    });
    expect(vendors.email.describedAs).toBe('Mailpit v1.30.2 at http://127.0.0.1:55324');
    // And the witness grants on it, which is the whole point of the probe.
    expect(witnessedCapability('vendors.email', vendors).provenance).toBe('real');
  });
});

describe('nothing is granted real by prefix — the live route\'s admission checks', () => {
  const surface = { completeSignup: async () => ({}), signIn: async () => ({}) };

  it('refuses a live sut capability with no attestation', async () => {
    expect(() =>
      liveSutCapability('sut.accounts', {} as object, ['completeSignup'], surface, {
        evidence: 'looks convincing',
        constructedFor: 'slot',
      }),
    ).toThrow(/with no slot attestation/);
  });

  it('refuses an enumeration naming a method the loaded adapter does not implement', async () => {
    const attestation = await anAttestation();
    expect(() =>
      liveSutCapability('sut.accounts', {} as object, ['completeSignup', 'teleport'], surface, attestation),
    ).toThrow(/teleport/);
  });

  it('refuses an enumeration naming a member that comes from Object.prototype (ruling S1-3)', async () => {
    /*
     * `typeof surface[method] === 'function'` walks the whole prototype chain, so `toString`,
     * `hasOwnProperty` and `constructor` all passed the existence check — and the ledger then granted
     * `real` over a member the adapter never wrote. A member counts only if it is found before
     * `Object.prototype`.
     */
    const attestation = await anAttestation();
    for (const inherited of ['toString', 'hasOwnProperty', 'constructor']) {
      expect(
        () => liveSutCapability('sut.accounts', {} as object, ['completeSignup', inherited], surface, attestation),
        inherited,
      ).toThrow(new RegExp(inherited));
    }
  });

  it('still admits a method on an AUTHORED prototype — the walk stops at Object.prototype, not at the surface', async () => {
    // Own-property-only would refuse a class instance's methods, which are the adapter's own work.
    class Authored {
      async completeSignup(): Promise<object> {
        return {};
      }
    }
    const attestation = await anAttestation();
    const capability = liveSutCapability(
      'sut.accounts',
      {} as object,
      ['completeSignup'],
      new Authored() as unknown as Record<string, unknown>,
      attestation,
    );
    expect(capability.provenance).toBe('real');
  });

  it('refuses an EMPTY enumeration — a real verdict over nothing at all', async () => {
    const attestation = await anAttestation();
    expect(() => liveSutCapability('sut.accounts', {} as object, [], surface, attestation)).toThrow(/EMPTY backed-method/);
  });

  it('refuses a duplicated name, because a list with repeats is not the closed list it claims to be', async () => {
    const attestation = await anAttestation();
    expect(() =>
      liveSutCapability('sut.accounts', {} as object, ['completeSignup', 'completeSignup'], surface, attestation),
    ).toThrow(/more than once/);
  });

  it('refuses every name outside its own family — a witness-table name, a bare key, an empty key', async () => {
    const attestation = await anAttestation();
    /*
     * THE THREE ROUTES PARTITION THE NAMESPACE, and this constructor's family is `sut.<key>` and
     * nothing else. A live grant for `clock.controlled` would stamp real on a name whose witness
     * might have REFUSED the value — routing round the table through a door the table does not
     * watch — and it is refused by the family check, which is the first one it meets.
     *
     * THE WITNESS-TABLE CHECK INSIDE THIS CONSTRUCTOR IS THEREFORE UNREACHABLE TODAY, and that is
     * said here rather than left for a reader to discover: no name on the closed table begins with
     * `sut.`, so the family check catches every one of them first. It is kept because the two rules
     * are independent — a witness added under that prefix would make it the only thing standing
     * between a table name and a real verdict — and because a guard that only exists while a
     * coincidence holds is the kind that disappears when the coincidence does.
     */
    for (const name of ['clock.controlled', 'vendors.email', 'fixtures.worlds', 'accounts', 'sut.']) {
      expect(() => liveSutCapability(name, {} as object, ['completeSignup'], surface, attestation), name).toThrow(
        /this constructor builds sut\.<key> names/,
      );
    }
  });

  it('grants real with evidence that names the enumeration and the attestation', async () => {
    const attestation = await anAttestation('the integration-tier slot for req-001');
    const capability = liveSutCapability('sut.accounts', {} as object, ['completeSignup', 'signIn'], surface, attestation);
    expect(capability.provenance).toBe('real');
    expect(capability.standInReason).toBeNull();
    expect(capability.realEvidence).toContain('completeSignup, signIn');
    expect(capability.realEvidence).toContain("answered with this run's runner-minted attestation nonce");
    expect(stubbedCapabilityNames([capability]), 'a live sut capability appeared on the stand-in ledger').toEqual([]);
  });

  it('the fixtures half needs the same attestation and grants the same way', async () => {
    expect(() => liveFixturesCapability({}, { evidence: 'trust me', constructedFor: 'slot' })).toThrow(/no slot attestation/);
    const capability = liveFixturesCapability({}, await anAttestation());
    expect(capability.name).toBe('fixtures.worlds');
    expect(capability.provenance).toBe('real');
  });

  it('the adapter-derived route still stamps stand-in, so the loop tier cannot reach the live one', () => {
    // The routes are not interchangeable and this is the assertion that says so: the same name,
    // through the older route, is a stand-in whatever evidence anybody holds.
    const capability = adapterDerivedCapability('sut.accounts', {}, 'file:///anything/_fixture.ts');
    expect(capability.provenance).toBe('stand-in');
  });
});

describe('the attested real clock, and the witness branch that grants it', () => {
  it('grants real only on the harness\'s own constructor attestation', async () => {
    const attestation = await anAttestation();
    const capability = witnessedCapability('clock.controlled', createAttestedRealClock(attestation));
    expect(capability.provenance).toBe('real');
    expect(capability.realEvidence).toContain('exposes no control seam');
  });

  it('REFUSES a seamless clock that carries no attestation — absence of a seam is never evidence', () => {
    // The sentence this whole file exists to keep true: "I found no stand-in seam" is not evidence
    // of real backing. A bare `AttestedRealClock` — same class, same shape, no attestation — refuses.
    expect(() => witnessedCapability('clock.controlled', new AttestedRealClock())).toThrow(/carries no attested real clock backing/);
    expect(() => witnessedCapability('clock.controlled', { now: () => 0 })).toThrow(/carries no attested real clock backing/);
  });

  it('still stamps the controlled clock a stand-in, naming the seam', () => {
    const capability = witnessedCapability('clock.controlled', new ControlledClock());
    expect(capability.provenance).toBe('stand-in');
    expect(capability.standInReason).toContain('freezeAt/advance');
  });

  it('refuses an attestation branded for a DIFFERENT capability', async () => {
    // A brand is minted for one name. Re-using the mail catcher's brand on the clock would be one
    // capability's evidence vouching for another, which is no evidence at all.
    const wrong = stampAttestation(new AttestedRealClock(), { evidence: 'a real mail catcher answered', constructedFor: 'vendors.email' });
    expect(() => witnessedCapability('clock.controlled', wrong)).toThrow(/carries no attested real clock backing/);
  });
});

describe('the vendor seam above loop is a mail CATCHER, and it is granted the same way', () => {
  it('grants real on an attested reader and refuses an unattested one', async () => {
    const attestation = await anAttestation();
    const reader = stampAttestation(
      { describedAs: 'Mailpit 1.30.2 at http://127.0.0.1:55324', messagesFor: async () => [] },
      { evidence: `probed — ${attestation.evidence}`, constructedFor: 'vendors.email' },
    );
    const granted = witnessedCapability('vendors.email', { email: reader });
    expect(granted.provenance).toBe('real');
    expect(granted.realEvidence).toContain('no send outcome can be armed from a test');

    expect(() => witnessedCapability('vendors.email', { email: { describedAs: 'x', messagesFor: async () => [] } })).toThrow(
      /carries no attested live provider/,
    );
  });
});

describe('the per-tier body form', () => {
  const loopBody = async (): Promise<void> => undefined;
  const integrationBody = async (): Promise<void> => undefined;

  it('runs the tier\'s own body, and a body written for another tier does not run', () => {
    const bodies = { loop: loopBody, integration: integrationBody, drill: loopBody };
    expect(chooseTierBody(bodies, 'loop')).toBe(loopBody);
    expect(chooseTierBody(bodies, 'integration')).toBe(integrationBody);
  });

  it('falls back to `default` for every tier the map does not name', () => {
    const bodies = { default: loopBody, integration: integrationBody };
    expect(chooseTierBody(bodies, 'loop')).toBe(loopBody);
    expect(chooseTierBody(bodies, 'drill')).toBe(loopBody);
    expect(chooseTierBody(bodies, 'integration')).toBe(integrationBody);
  });

  it('REFUSES a map that leaves a tier uncovered, because MISSING is a state no declaration can describe', () => {
    expect(tierBodyProblem({ loop: loopBody, integration: integrationBody }, 'AT-001.12')).toMatch(/but not drill/);
    expect(tierBodyProblem({ integration: integrationBody }, 'AT-001.12')).toMatch(/but not loop, drill/);
    expect(tierBodyProblem({}, 'AT-001.12')).toMatch(/names no body at all/);
    expect(tierBodyProblem({ surface: 'ui' }, 'AT-001.12')).toMatch(/names no body at all/);
  });

  it('accepts a full map and a map with a default', () => {
    expect(tierBodyProblem({ loop: loopBody, integration: integrationBody, drill: loopBody }, 'AT-001.12')).toBeNull();
    expect(tierBodyProblem({ default: loopBody, integration: integrationBody }, 'AT-001.12')).toBeNull();
  });

  it('raises the timeout for the TIER it was written for, and for no other (ruling S2-1)', () => {
    /*
     * The loop tier keeps `vitest.config.ts`'s 30 seconds — `undefined` is what leaves it in place —
     * and the two ids that wait out a real access token get a bounded raise at integration only.
     * A body that hangs still fails, because a value is still a value.
     */
    const raised = { integration: 240_000 };
    expect(tierTimeout(raised, 'integration')).toBe(240_000);
    expect(tierTimeout(raised, 'loop'), 'the loop tier inherited an integration-tier raise').toBeUndefined();
    expect(tierTimeout(raised, 'drill')).toBeUndefined();
    expect(tierTimeout(undefined, 'integration')).toBeUndefined();
    expect(tierTimeout(raised, null)).toBeUndefined();
  });

  it('ignores a timeout that is not a usable number, rather than passing it to vitest', () => {
    expect(tierTimeout({ integration: 0 }, 'integration')).toBeUndefined();
    expect(tierTimeout({ integration: -1 }, 'integration')).toBeUndefined();
    expect(tierTimeout({ integration: Number.POSITIVE_INFINITY }, 'integration')).toBeUndefined();
  });

  it('with no tier set, the default body is chosen rather than nothing', () => {
    // `AT_TIER` unset is a plainly-diagnosed misuse: `openWorld` refuses with `tier-unset` on the
    // first open(). Registering NOTHING would turn that diagnosis into an unexplained missing row.
    expect(chooseTierBody({ default: loopBody, integration: integrationBody }, null)).toBe(loopBody);
    expect(chooseTierBody({ loop: loopBody, integration: integrationBody, drill: loopBody }, null)).toBe(loopBody);
  });
});

describe('the loop tier is untouched', () => {
  it('builds the same ledger, with the same verdicts and the same reasons, as before any of this', async () => {
    // THE PROMISE EVERY OTHER TEST IN THIS FILE IS WORTH NOTHING WITHOUT. The integration tier gained
    // three routes, a witness branch each on two names, and a whole second ledger builder. If any of
    // that reached the loop tier, thirteen green ids in REQ-001 and eleven in REQ-016 would be
    // grading something other than what they graded yesterday.
    const ledger = await buildCapabilityLedger({ requirement: 'req-016', tier: 'loop' });
    try {
      expect(stubbedCapabilityNames(ledger.all)).toEqual([
        'clock.controlled',
        'fixtures.worlds',
        'oracles.judge',
        'sut.notifications',
        'vendors.email',
      ]);
      expect(ledger.clock.standInReason).toContain('freezeAt/advance');
      expect(ledger.vendors.standInReason).toContain('email.rejectNext');
      expect(ledger.fixtures.standInReason).toContain('_fixture.ts');
      expect(ledger.config.realEvidence).toContain('article');
      expect(ledger.sentinels.realEvidence).toContain('article');
      expect(ledger.faults.realEvidence).toContain('article');
      expect(ledger.oracles.standInReason).toContain('replay-fs');
    } finally {
      await ledger.teardown();
    }
  });
});
