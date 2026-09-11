/**
 * The ids REQ-002 has not landed yet.
 *
 * `harness/check.ts` refuses a run when any P0 id has no registered call site, so every P0 id
 * in `.taskmaster/docs/acceptance/at-req-002.md` needs an executable call site from the day the
 * suite exists. An id that waits on a missing surface is declared, not faked: `awaiting()` throws
 * `CapabilityPending` with the capability names only. `tests/at/expected/req-002.json` declares
 * that red by shape. A red that turns green fails the declaration, so the unit that lands an id
 * moves it to green in the same change.
 *
 * Every red in this suite is `capability-pending`. `expected.ts` rebuilds the whole first line
 * and compares it for equality, so the names after the em dash are matched exactly.
 */

import { CapabilityPending } from './_bind.ts';

/**
 * The surfaces the red set waits on, named once so the call sites and the manifest agree by
 * copying one string.
 */
export const AWAITED = {
  discoverySurface: 'ui.discovery-surface',
  projectFuelCheckout: 'checkout.project-fuel',
  fundedTurnBilling: 'billing.funded-turn',
  publishFlow: 'publish.flow',
  triageQueue: 'triage.queue',
  publicListingScreens: 'ui.public-listing-screens',
} as const;

export type AwaitedSurface = (typeof AWAITED)[keyof typeof AWAITED];

/**
 * An id whose criterion needs a surface this tree does not have. The body throws the capability
 * red the manifest declares; a later unit may assert a shipped policy first and must still end here.
 * It takes no context, so it fits the loop and the integration slot of a per-tier map alike.
 */
export function awaiting(...surfaces: AwaitedSurface[]): () => Promise<void> {
  return async (): Promise<void> => {
    throw new CapabilityPending(surfaces);
  };
}
