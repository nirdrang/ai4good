/**
 * H3 planted markers — a value minted by the harness, carried by the product, found again by a scan.
 *
 * The judgement about whether a value is EVIDENCE at all is not made here: `sentinelValueProblem`
 * in `guards.ts` owns it, and `plant()` routes through it rather than re-deriving "long enough and
 * never reused". Two copies of that rule is how the two drift apart, and a sentinel rule that has
 * drifted green-lights every suite at once.
 *
 * THE SCAN'S WHOLE VALUE IS THAT IT CAN SAY "NOT THERE" WITHOUT MEANING "DID NOT LOOK". An empty
 * array from a store nobody read is indistinguishable from an empty array from a store that was
 * genuinely searched — and the first is worthless while the second is the absence half of
 * AT-016.01. So a scope the adapter never registered is a REFUSAL, never `[]`; after that, `[]`
 * means one thing only.
 */

import type { Sentinel, Sentinels } from './contracts.ts';
import { sentinelValueProblem } from './guards.ts';

/**
 * What a fixture adapter exposes so its stores can be scanned. OPTIONAL on the adapter — the
 * runner's black-box trees plant two-method adapters — and absent means every scan is refused,
 * which is the loud degradation, not a quiet one.
 */
export type AdapterSentinelSeam = {
  /** the named stores this adapter can be searched. `scan()` refuses every other name. */
  scopes(): readonly string[];
  /** every searchable body currently held in that scope */
  read(scope: string): readonly string[];
};

export function createSentinels(seam?: AdapterSentinelSeam): Sentinels {
  const planted: Sentinel[] = [];
  let nextId = 1;

  return {
    plant: async (kind, value) => {
      const problem = sentinelValueProblem(
        value,
        planted.map((sentinel) => sentinel.value),
      );
      if (problem !== null) throw new Error(`refusing to plant a ${kind} sentinel: ${problem}`);
      const sentinel: Sentinel = { id: `sentinel-${nextId++}-${kind}`, value };
      planted.push(sentinel);
      return sentinel;
    },

    scan: async (scope) => {
      const scopes = seam ? [...seam.scopes()] : [];
      if (!scopes.includes(scope)) {
        throw new Error(
          `the product exposes no sentinel scope named ${JSON.stringify(scope)} — scanning it would ` +
            `report every sentinel absent from a store nothing ever read. Exposed scopes: ` +
            `${scopes.length ? [...scopes].sort().join(', ') : '(none)'}`,
        );
      }
      // `seam` is present: `scopes` is non-empty only when it is, and an empty `scopes` refuses
      // every name above.
      const bodies = seam ? [...seam.read(scope)] : [];
      return planted.filter((sentinel) => bodies.some((body) => body.includes(sentinel.value)));
    },
  };
}
