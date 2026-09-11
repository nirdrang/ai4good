/**
 * The ids REQ-002 has not landed yet, and the leaf that will land each one.
 *
 * `harness/check.ts` refuses a run when any P0 id has no registered call site, so all twenty-seven
 * ids of `.taskmaster/docs/acceptance/at-req-002.md` need executable call sites from the day the
 * suite exists. An id not yet written is declared, not faked: it throws, stamped with its own id
 * and with the manifest leaf that will make it real, and `tests/at/expected/req-002.json` declares
 * that red by shape. A red that turns green fails the declaration, so the unit that lands an id
 * moves it to green in the same change.
 *
 * The tail after the em dash is free: `expected.ts` anchors on the prefix only. Nothing mechanical
 * holds the leaf label to the truth; the manifest and the reviewer do.
 */

import { AtPending, CapabilityPending, type AtContext } from './_bind.ts';

/**
 * The manifest's leaves, in the manifest's own words shortened to a recall hint. The keys are the
 * deliverable-and-leaf labels from `loop/decomp/req-002.md`.
 */
export const LEAF = {
  D1_L1: 'D1.L1 (profile create: five fields persist and render)',
  D1_L2: 'D1.L2 (profile edit by the NGO admin only)',
  D2_L1: 'D2.L1 (tier grants and the vet math)',
  D2_L2: 'D2.L2 (zero-credit block and the remedies that restore)',
  D2_L3: 'D2.L3 (UTC hard reset once per UTC day)',
  D2_L4: 'D2.L4 (no Discovery wallet: paid continuation is project fuel)',
  D3_L1: 'D3.L1 (the vet action audit record, every field or no commit)',
  D3_L2: 'D3.L2 (only the platform admin vets, only by hand)',
  D3_L3: 'D3.L3 (unvet closes publishing, funding untouched, outcome via the emitter)',
  D4_L1: 'D4.L1 (emailed registration documents metadata only, identity documents refused)',
  D5_L1: 'D5.L1 (publish gates: unvetted blocked, vetted publish goes to triage)',
  D5_L2: 'D5.L2 (what vetting never gates: Discovery after email verification)',
} as const;

export type LeafLabel = (typeof LEAF)[keyof typeof LEAF];

/** One not-yet-landed id's whole body: the harness is up and the system under test is absent. */
export function notLanded(leaf: LeafLabel): (ctx: AtContext) => Promise<void> {
  return async (ctx: AtContext): Promise<void> => {
    throw new AtPending(ctx.atId, 'sut-missing', `REQ-002 ${leaf} has not landed`);
  };
}

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
