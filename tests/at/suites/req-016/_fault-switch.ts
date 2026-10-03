import type { ArmedFault, FaultKind } from '../../harness/faults.ts';

export type CrashSwitch<Ledger> = {
  armed(): Ledger | null;
  arm(kind: FaultKind): ArmedFault;
};

export function createCrashSwitch<Ledger>(
  point: string,
  openLedger: (kind: FaultKind) => Ledger,
  triggerCount: (ledger: Ledger) => number,
  implemented: readonly FaultKind[] = ['crash'],
): CrashSwitch<Ledger> {
  let live: Ledger | null = null;
  return {
    armed: () => live,
    arm: (kind) => {
      if (!implemented.includes(kind)) {
        throw new Error(
          `fault point ${JSON.stringify(point)} implements no ${JSON.stringify(kind)} fault. It implements: ${implemented.join(', ')}`,
        );
      }
      const ledger = openLedger(kind);
      live = ledger;
      return {
        triggerCount: () => triggerCount(ledger),
        disarm: () => {
          if (live === ledger) live = null;
        },
      };
    },
  };
}
