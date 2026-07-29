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

  async observedByProduct(): Promise<string> {
    return new Date(this.currentMs).toISOString();
  }
}
