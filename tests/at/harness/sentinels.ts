import type { Sentinel, Sentinels } from './contracts.ts';
import { sentinelValueProblem } from './guards.ts';

export type AdapterSentinelSeam = {
  scopes(): readonly string[];
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
      const bodies = seam ? [...seam.read(scope)] : [];
      return planted.filter((sentinel) => bodies.some((body) => body.includes(sentinel.value)));
    },
  };
}
