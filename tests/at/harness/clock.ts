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
