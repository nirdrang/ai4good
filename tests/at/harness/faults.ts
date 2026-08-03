/**
 * H3 forced failures — arm a named point in the product, and restart the delivery process.
 *
 * THE COUNT IS THE WHOLE THING. `FaultHandle.triggerCount()` reports how many times execution
 * actually REACHED the armed point, never how many times a test armed it. A handle that counted
 * arming as firing would make every atomicity test in thirty suites pass on nothing at all, with no
 * suite showing a symptom — which is why the counter is owned by the ADAPTER, at the point itself,
 * and this module only reads it. There is nowhere here for a count to be invented.
 *
 * The four judgements — is this point real, did the fault fire, did the restart restart anything —
 * live in `guards.ts` and are routed to, never re-derived here.
 */

import type { FaultHandle, Faults } from './contracts.ts';
import { faultFiredProblem, faultPointProblem, processEpochProblem } from './guards.ts';

/** The fault kinds the shared contract admits, named once so an adapter seam can spell them. */
export type FaultKind = 'crash' | 'reject' | 'lose_ack';

/**
 * ONE LIVE ARMING, produced by the adapter because only the adapter can know when execution reached
 * the point. `disarm()` is separate from the contract's `clear()`: clearing also passes judgement on
 * whether the fault fired, and that judgement is this module's, not the adapter's.
 */
export type ArmedFault = {
  /** times execution REACHED the point while this arming was live — never times it was armed */
  triggerCount(): number;
  disarm(): void;
};

/**
 * What a fixture adapter exposes so faults can be induced in it. OPTIONAL on the adapter — the
 * runner's black-box trees plant two-method adapters — and absent means `at()` refuses in the
 * guard's own words ("Exposed points: (none)") and `processRestart()` refuses on an empty epoch.
 */
export type AdapterFaultSeam = {
  /** the fault points this adapter really honours; arming anything else must not be a no-op */
  points(): readonly string[];
  arm(point: string, kind: FaultKind): ArmedFault;
  /** identity of the delivery process; MUST change across processRestart() */
  processEpoch(): string;
  processRestart(): void | Promise<void>;
};

export function createFaults(seam?: AdapterFaultSeam): Faults {
  const exposed = (): string[] => (seam ? [...seam.points()] : []);
  const epoch = (): string => (seam ? seam.processEpoch() : '');

  return {
    points: async () => exposed(),

    at: async (point, kind) => {
      if (seam === undefined) {
        // No seam exposes no points, and the same guard writes the refusal — an adapter that
        // supplies nothing degrades to a loud "Exposed points: (none)", never to a silent no-op.
        throw new Error(`${faultPointProblem(point, [])}`);
      }
      const problem = faultPointProblem(point, exposed());
      if (problem !== null) throw new Error(problem);

      const armed = seam.arm(point, kind);
      const handle: FaultHandle = {
        point,
        triggerCount: async () => armed.triggerCount(),
        clear: async () => {
          const count = armed.triggerCount();
          // Disarm FIRST, then judge: the arming must not survive a refusal into the next id, and
          // what is being refused is the conclusion the test is about to draw, not the cleanup.
          armed.disarm();
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
