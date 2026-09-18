import { AtPending, CapabilityPending } from '../../harness/pending.ts';
export const AWAITED = {
  discoverySurface: 'ui.discovery-surface', projectFuelCheckout: 'checkout.project-fuel',
  fundedTurnBilling: 'billing.funded-turn', anthropicLive: 'vendors.anthropic',
  referenceUpload: 'storage.reference-upload', publishFlow: 'publish.flow', triageQueue: 'triage.queue',
  guardrails: 'discovery.guardrails', scopeOutput: 'discovery.scope-output',
  sensitivityTiers: 'discovery.sensitivity-tiers', fitDecline: 'discovery.fit-decline', regeneration: 'discovery.regeneration',
  prdAuthoring: 'prd.authoring', backlogDerivation: 'backlog.derivation',
} as const;
export function awaiting(...names: (typeof AWAITED)[keyof typeof AWAITED][]) {
  return async () => { throw new CapabilityPending(names); };
}
export function notYet(id: string) {
  return async () => { throw new AtPending(id, 'sut-missing', 'lands in a later unit of this run'); };
}
