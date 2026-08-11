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

import { attestSlot, mintAttestationNonce } from './attestation.ts';
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
import { aboveLoopStubbedRefusal, chooseTierBody, tierBodyProblem } from './registry.ts';

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
