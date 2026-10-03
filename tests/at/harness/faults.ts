import type { FaultHandle, Faults } from './contracts.ts';
import { faultAlreadyArmedProblem, faultFiredProblem, faultPointProblem, processEpochProblem } from './guards.ts';

export type FaultKind = 'crash' | 'reject' | 'lose_ack';

export type ArmedFault = {
  triggerCount(): number;
  disarm(): void;
};

export type AdapterFaultSeam = {
  points(): readonly string[];
  arm(point: string, kind: FaultKind): ArmedFault;
  processEpoch(): string;
  processRestart(): void | Promise<void>;
};

export function createFaults(seam?: AdapterFaultSeam): Faults {
  const exposed = (): string[] => (seam ? [...seam.points()] : []);
  const epoch = (): string => (seam ? seam.processEpoch() : '');
  const liveArmings = new Map<string, ArmedFault>();

  return {
    points: async () => exposed(),

    at: async (point, kind) => {
      if (seam === undefined) {
        throw new Error(`${faultPointProblem(point, [])}`);
      }
      const problem = faultPointProblem(point, exposed());
      if (problem !== null) throw new Error(problem);

      const displaced = faultAlreadyArmedProblem(point, liveArmings.keys());
      if (displaced !== null) throw new Error(displaced);

      const armed = seam.arm(point, kind);
      liveArmings.set(point, armed);
      const handle: FaultHandle = {
        point,
        triggerCount: async () => armed.triggerCount(),
        clear: async () => {
          const count = armed.triggerCount();
          armed.disarm();
          if (liveArmings.get(point) === armed) liveArmings.delete(point);
          const fired = faultFiredProblem(point, count);
          if (fired !== null) throw new Error(fired);
        },
      };
      return handle;
    },

    processRestart: async () => {
      const before = epoch();
      await seam?.processRestart();
      const after = epoch();
      const problem = processEpochProblem(before, after);
      if (problem !== null) throw new Error(problem);
    },

    processEpoch: async () => epoch(),
  };
}
