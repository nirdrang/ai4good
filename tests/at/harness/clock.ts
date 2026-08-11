import { attestationOf, stampAttestation, SLOT_ATTESTATION_BRAND, type LiveAttestation } from './capabilities.ts';

/**
 * THE PASSAGE OF TIME, WITH NO SEAM TO COMMAND IT — the integration tier's clock.
 *
 * It is a different CLASS rather than a `ControlledClock` with its two methods removed, and that is
 * structural rather than tidy. `capabilities.ts`'s witness reads callability through the prototype
 * chain, so a subclass that inherited `advance` would be stamped a stand-in however it was built;
 * and the per-tier context types (`registry.ts`) expose this type to an integration body, so a body
 * that reaches for `freezeAt` fails to COMPILE rather than failing at run time.
 *
 * WHAT MAKES IT `real` ON THE LEDGER is not the absence of the seam. "I found no stand-in seam" is
 * the sentence `capabilities.ts` exists to forbid, and an object with `advance` deleted would
 * satisfy it. What makes it real is the slot attestation stamped on it here: this clock is
 * constructed only where a live round trip against the prepared slot has already succeeded, and the
 * witness grants on that.
 */
export class AttestedRealClock {
  now(): number {
    return Date.now();
  }
}

/**
 * Build the integration tier's clock and stamp it with the attestation that was already proved.
 *
 * A FUNCTION RATHER THAN A PUBLIC CONSTRUCTOR, so there is exactly one place a real clock can come
 * into existence and it is a place that has an attestation in its hand.
 *
 * AND THE ATTESTATION IS VALIDATED, NOT MERELY TYPED (gate-2 ruling S1-2). `LiveAttestation` is a
 * STRUCTURAL type — two strings — so `{ evidence: 'anything', constructedFor: 'slot' }` satisfied it
 * and minted a real clock out of an object literal. The live sut and fixtures constructors already
 * check the BRAND, which is stamped on the attestation object itself and cannot be written by hand;
 * this one now asks the same question the same way. The threat model this tree names is the honest
 * mistake nothing notices, and an unbranded attestation was one.
 */
export function createAttestedRealClock(attestation: LiveAttestation): AttestedRealClock {
  const attested = attestationOf(attestation, SLOT_ATTESTATION_BRAND);
  if (!attested) {
    throw new Error(
      'refusing to construct an attested real clock: the attestation handed in carries no slot brand, so it is a ' +
        'plain object with two strings on it rather than the record of a round trip that happened. Only ' +
        '`attestSlot()` mints one, and it mints it after the coordinates it was handed answered with this run\'s ' +
        'runner-minted value.',
    );
  }
  return stampAttestation(new AttestedRealClock(), {
    evidence: `the harness's own real-clock constructor built it against the prepared slot — ${attested.evidence}`,
    constructedFor: 'clock.controlled',
  });
}

export class ControlledClock {
  private currentMs = Date.parse('2026-01-01T00:00:00.000Z');

  async freezeAt(iso: string): Promise<void> {
    const next = Date.parse(iso);
    if (!Number.isFinite(next)) throw new Error(`controlled clock cannot freeze at invalid timestamp ${JSON.stringify(iso)}`);
    this.currentMs = next;
  }

  async advance(ms: number): Promise<void> {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new Error(`controlled clock advance must be a finite non-negative number, got ${ms}`);
    }
    this.currentMs += ms;
  }

  now(): number {
    return this.currentMs;
  }

  /*
   * There was an `observedByProduct()` here, and it is deliberately gone. It returned this
   * clock's own time, which is the clock answering a question about itself: it passes whether or
   * not a single line of product code reads the clock, so it proves exactly nothing about the
   * wiring it claimed to prove. Product-clock wiring is proven BEHAVIOURALLY — advance the clock,
   * then assert a product behaviour that depends on time actually changed (AT-016.08's anti-spam
   * window, and the conformance test that drives it through createHarness()).
   *
   * Sampling time from inside the product process IS a real capability, and a useful one; it needs
   * a product process to sample, so it belongs to an integration-tier slice, not to a self-report.
   */
}
