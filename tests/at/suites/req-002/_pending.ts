import { CapabilityPending } from './_bind.ts';

export const AWAITED = {
  discoverySurface: 'ui.discovery-surface',
  projectFuelCheckout: 'checkout.project-fuel',
  fundedTurnBilling: 'billing.funded-turn',
  publishFlow: 'publish.flow',
  publicListingScreens: 'ui.public-listing-screens',
} as const;

export type AwaitedSurface = (typeof AWAITED)[keyof typeof AWAITED];

export function awaiting(...surfaces: AwaitedSurface[]): () => Promise<void> {
  return async (): Promise<void> => {
    throw new CapabilityPending(surfaces);
  };
}
