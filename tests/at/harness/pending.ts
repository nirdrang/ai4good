export type PendingPhase = 'harness-missing' | 'sut-missing' | 'tier-unset';

export class AtPending extends Error {
  constructor(
    readonly atId: string,
    readonly phase: PendingPhase,
    detail: string,
  ) {
    super(`${atId} PENDING [${phase}] — ${detail}`);
    this.name = 'AtPending';
  }
}

export class CapabilityPending extends Error {
  constructor(readonly capabilities: readonly string[]) {
    super(`CAPABILITY PENDING — ${capabilities.join(', ')}`);
    this.name = 'CapabilityPending';
  }
}
